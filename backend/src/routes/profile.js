const express = require('express');
const { getDb, save } = require('../db/database');

const router = express.Router();

// Helper to convert sql.js result to object array
function toObjects(result) {
    if (!result || !result.length) return [];
    const { columns, values } = result[0];
    return values.map(row => {
        const obj = {};
        columns.forEach((col, i) => obj[col] = row[i]);
        return obj;
    });
}

// Helper to get single value
function getValue(result) {
    if (!result || !result.length || !result[0].values.length) return null;
    return result[0].values[0][0];
}

// Helper to build full profile object
function getFullProfile() {
    const db = getDb();
    
    const profileResult = db.exec('SELECT * FROM profile WHERE id = 1');
    if (!profileResult.length) return null;
    
    const profile = toObjects(profileResult)[0];
    const skills = toObjects(db.exec('SELECT name FROM skills ORDER BY name')).map(s => s.name);
    const work = toObjects(db.exec('SELECT description FROM work ORDER BY sort_order')).map(w => w.description);
    
    const projects = toObjects(db.exec('SELECT id, title, description FROM projects'));
    const projectsWithDetails = projects.map(p => {
        const links = toObjects(db.exec('SELECT url FROM project_links WHERE project_id = ?', [p.id])).map(l => l.url);
        const projectSkills = toObjects(db.exec(`
            SELECT s.name FROM skills s
            JOIN project_skills ps ON s.id = ps.skill_id
            WHERE ps.project_id = ?
        `, [p.id])).map(s => s.name);
        return { title: p.title, description: p.description, links, skills: projectSkills };
    });

    return {
        name: profile.name,
        email: profile.email,
        education: profile.education,
        skills,
        projects: projectsWithDetails,
        work,
        links: {
            github: profile.links_github,
            linkedin: profile.links_linkedin,
            portfolio: profile.links_portfolio
        }
    };
}

// GET /profile - Read profile
router.get('/', (req, res) => {
    try {
        const profile = getFullProfile();
        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }
        res.json(profile);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// POST /profile - Create profile
router.post('/', (req, res) => {
    const { name, email, education, skills, projects, work, links } = req.body;
    const db = getDb();
    
    if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
    }

    try {
        const existing = db.exec('SELECT id FROM profile WHERE id = 1');
        if (existing.length && existing[0].values.length) {
            return res.status(409).json({ error: 'Profile already exists. Use PUT to update.' });
        }

        // Insert profile
        db.run(`INSERT INTO profile (id, name, email, education, links_github, links_linkedin, links_portfolio)
                VALUES (1, ?, ?, ?, ?, ?, ?)`,
            [name, email, education || null, links?.github || null, links?.linkedin || null, links?.portfolio || null]);

        // Insert skills
        if (skills?.length) {
            skills.forEach(s => db.run('INSERT OR IGNORE INTO skills (name) VALUES (?)', [s]));
        }

        // Insert work
        if (work?.length) {
            work.forEach((w, i) => db.run('INSERT INTO work (description, sort_order) VALUES (?, ?)', [w, i]));
        }

        // Insert projects
        if (projects?.length) {
            projects.forEach(p => {
                db.run('INSERT INTO projects (title, description) VALUES (?, ?)', [p.title, p.description || null]);
                const projectId = getValue(db.exec('SELECT last_insert_rowid() as id'));
                
                p.links?.forEach(link => db.run('INSERT INTO project_links (project_id, url) VALUES (?, ?)', [projectId, link]));
                p.skills?.forEach(skillName => {
                    db.run('INSERT OR IGNORE INTO skills (name) VALUES (?)', [skillName]);
                    const skillId = getValue(db.exec('SELECT id FROM skills WHERE name = ?', [skillName]));
                    if (skillId) db.run('INSERT OR IGNORE INTO project_skills (project_id, skill_id) VALUES (?, ?)', [projectId, skillId]);
                });
            });
        }

        save();
        res.status(201).json(getFullProfile());
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// PUT /profile - Update profile
router.put('/', (req, res) => {
    const { name, email, education, skills, projects, work, links } = req.body;
    const db = getDb();
    
    try {
        const existing = db.exec('SELECT id FROM profile WHERE id = 1');
        if (!existing.length || !existing[0].values.length) {
            return res.status(404).json({ error: 'Profile not found. Use POST to create.' });
        }

        // Update profile fields
        if (name) db.run('UPDATE profile SET name = ? WHERE id = 1', [name]);
        if (email) db.run('UPDATE profile SET email = ? WHERE id = 1', [email]);
        if (education !== undefined) db.run('UPDATE profile SET education = ? WHERE id = 1', [education]);
        if (links?.github !== undefined) db.run('UPDATE profile SET links_github = ? WHERE id = 1', [links.github]);
        if (links?.linkedin !== undefined) db.run('UPDATE profile SET links_linkedin = ? WHERE id = 1', [links.linkedin]);
        if (links?.portfolio !== undefined) db.run('UPDATE profile SET links_portfolio = ? WHERE id = 1', [links.portfolio]);
        db.run('UPDATE profile SET updated_at = CURRENT_TIMESTAMP WHERE id = 1');

        // Replace skills if provided
        if (skills) {
            db.run('DELETE FROM skills');
            skills.forEach(s => db.run('INSERT OR IGNORE INTO skills (name) VALUES (?)', [s]));
        }

        // Replace work if provided
        if (work) {
            db.run('DELETE FROM work');
            work.forEach((w, i) => db.run('INSERT INTO work (description, sort_order) VALUES (?, ?)', [w, i]));
        }

        // Replace projects if provided
        if (projects) {
            db.run('DELETE FROM project_skills');
            db.run('DELETE FROM project_links');
            db.run('DELETE FROM projects');
            
            projects.forEach(p => {
                db.run('INSERT INTO projects (title, description) VALUES (?, ?)', [p.title, p.description || null]);
                const projectId = getValue(db.exec('SELECT last_insert_rowid() as id'));
                
                p.links?.forEach(link => db.run('INSERT INTO project_links (project_id, url) VALUES (?, ?)', [projectId, link]));
                p.skills?.forEach(skillName => {
                    db.run('INSERT OR IGNORE INTO skills (name) VALUES (?)', [skillName]);
                    const skillId = getValue(db.exec('SELECT id FROM skills WHERE name = ?', [skillName]));
                    if (skillId) db.run('INSERT OR IGNORE INTO project_skills (project_id, skill_id) VALUES (?, ?)', [projectId, skillId]);
                });
            });
        }

        save();
        res.json(getFullProfile());
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
