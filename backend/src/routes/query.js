const express = require('express');
const { getDb } = require('../db/database');

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

// GET /projects?skill=python - Filter projects by skill
router.get('/projects', (req, res) => {
    const { skill } = req.query;
    const db = getDb();
    
    try {
        let projects;
        if (skill) {
            projects = toObjects(db.exec(`
                SELECT DISTINCT p.id, p.title, p.description
                FROM projects p
                JOIN project_skills ps ON p.id = ps.project_id
                JOIN skills s ON ps.skill_id = s.id
                WHERE LOWER(s.name) LIKE LOWER('%' || ? || '%')
            `, [skill]));
        } else {
            projects = toObjects(db.exec('SELECT id, title, description FROM projects'));
        }

        const result = projects.map(p => {
            const links = toObjects(db.exec('SELECT url FROM project_links WHERE project_id = ?', [p.id])).map(l => l.url);
            const skills = toObjects(db.exec(`
                SELECT s.name FROM skills s
                JOIN project_skills ps ON s.id = ps.skill_id
                WHERE ps.project_id = ?
            `, [p.id])).map(s => s.name);
            return { title: p.title, description: p.description, links, skills };
        });

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// GET /skills/top - Get top skills (by project count)
router.get('/skills/top', (req, res) => {
    const limit = parseInt(req.query.limit) || 5;
    const db = getDb();
    
    try {
        const skills = toObjects(db.exec(`
            SELECT s.name, COUNT(ps.project_id) as project_count
            FROM skills s
            LEFT JOIN project_skills ps ON s.id = ps.skill_id
            GROUP BY s.id, s.name
            ORDER BY project_count DESC, s.name ASC
            LIMIT ?
        `, [limit]));

        res.json(skills);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// GET /search?q=java - Search across profile data
router.get('/search', (req, res) => {
    const { q } = req.query;
    const db = getDb();
    
    if (!q || q.trim().length === 0) {
        return res.status(400).json({ error: 'Search query "q" is required' });
    }

    try {
        const searchTerm = q.toLowerCase();
        
        // Search in skills
        const matchingSkills = toObjects(db.exec(`
            SELECT name FROM skills WHERE LOWER(name) LIKE '%' || ? || '%'
        `, [searchTerm])).map(s => s.name);

        // Search in projects (title and description)
        const matchingProjects = toObjects(db.exec(`
            SELECT DISTINCT p.id, p.title, p.description
            FROM projects p
            LEFT JOIN project_skills ps ON p.id = ps.project_id
            LEFT JOIN skills s ON ps.skill_id = s.id
            WHERE LOWER(p.title) LIKE '%' || ? || '%'
               OR LOWER(p.description) LIKE '%' || ? || '%'
               OR LOWER(s.name) LIKE '%' || ? || '%'
        `, [searchTerm, searchTerm, searchTerm]));

        const projectResults = matchingProjects.map(p => {
            const links = toObjects(db.exec('SELECT url FROM project_links WHERE project_id = ?', [p.id])).map(l => l.url);
            const skills = toObjects(db.exec(`
                SELECT s.name FROM skills s
                JOIN project_skills ps ON s.id = ps.skill_id
                WHERE ps.project_id = ?
            `, [p.id])).map(s => s.name);
            return { title: p.title, description: p.description, links, skills };
        });

        // Search in work experience
        const matchingWork = toObjects(db.exec(`
            SELECT description FROM work WHERE LOWER(description) LIKE '%' || ? || '%'
        `, [searchTerm])).map(w => w.description);

        res.json({
            query: q,
            results: {
                skills: matchingSkills,
                projects: projectResults,
                work: matchingWork
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
