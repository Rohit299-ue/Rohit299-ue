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

// POST /api/projects - Add new project
router.post('/', (req, res) => {
    const { title, description, links, skills } = req.body;
    const db = getDb();
    
    if (!title) {
        return res.status(400).json({ error: 'Project title is required' });
    }

    try {
        // Insert project
        db.run('INSERT INTO projects (title, description) VALUES (?, ?)', [title, description || null]);
        const projectId = getValue(db.exec('SELECT last_insert_rowid() as id'));
        
        // Insert links
        if (links?.length) {
            links.forEach(link => {
                db.run('INSERT INTO project_links (project_id, url) VALUES (?, ?)', [projectId, link]);
            });
        }
        
        // Insert skills
        if (skills?.length) {
            const insertSkill = db.prepare ? db.prepare('INSERT OR IGNORE INTO skills (name) VALUES (?)') : null;
            skills.forEach(skillName => {
                db.run('INSERT OR IGNORE INTO skills (name) VALUES (?)', [skillName]);
                const skillId = getValue(db.exec('SELECT id FROM skills WHERE name = ?', [skillName]));
                if (skillId) {
                    db.run('INSERT OR IGNORE INTO project_skills (project_id, skill_id) VALUES (?, ?)', [projectId, skillId]);
                }
            });
        }

        save();
        
        // Return created project
        const project = toObjects(db.exec('SELECT id, title, description FROM projects WHERE id = ?', [projectId]))[0];
        const projectLinks = toObjects(db.exec('SELECT url FROM project_links WHERE project_id = ?', [projectId])).map(l => l.url);
        const projectSkills = toObjects(db.exec(`
            SELECT s.name FROM skills s
            JOIN project_skills ps ON s.id = ps.skill_id
            WHERE ps.project_id = ?
        `, [projectId])).map(s => s.name);
        
        res.status(201).json({
            id: project.id,
            title: project.title,
            description: project.description,
            links: projectLinks,
            skills: projectSkills
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    const db = getDb();
    
    try {
        // Check if project exists
        const existing = db.exec('SELECT id FROM projects WHERE id = ?', [id]);
        if (!existing.length || !existing[0].values.length) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Delete project (cascades to links and skills via foreign keys)
        db.run('DELETE FROM project_skills WHERE project_id = ?', [id]);
        db.run('DELETE FROM project_links WHERE project_id = ?', [id]);
        db.run('DELETE FROM projects WHERE id = ?', [id]);
        
        save();
        res.json({ message: 'Project deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
