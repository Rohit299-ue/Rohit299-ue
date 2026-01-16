const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

let db = null;
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/meapi.db');
const dataDir = path.dirname(dbPath);

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Schema SQL
const schema = `
CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    education TEXT,
    links_github TEXT,
    links_linkedin TEXT,
    links_portfolio TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    url TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_skills (
    project_id INTEGER NOT NULL,
    skill_id INTEGER NOT NULL,
    PRIMARY KEY (project_id, skill_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS work (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);
CREATE INDEX IF NOT EXISTS idx_projects_title ON projects(title);
CREATE INDEX IF NOT EXISTS idx_project_skills_skill ON project_skills(skill_id);
`;

// Seed data - Candidate profile information
const seedData = {
    profile: {
        name: "Your Name",
        email: "your.email@example.com",
        education: "Your Education",
        links: {
            github: "",
            linkedin: "",
            portfolio: ""
        }
    },
    skills: [],
    work: [],
    projects: []
};

async function initDatabase() {
    const SQL = await initSqlJs();
    
    // Try to load existing database
    if (fs.existsSync(dbPath)) {
        const buffer = fs.readFileSync(dbPath);
        db = new SQL.Database(buffer);
    } else {
        db = new SQL.Database();
        db.run(schema);
        seedDatabase();
        saveDatabase();
    }
    
    return db;
}

function seedDatabase() {
    // Insert profile
    db.run(`INSERT INTO profile (id, name, email, education, links_github, links_linkedin, links_portfolio)
            VALUES (1, ?, ?, ?, ?, ?, ?)`,
        [seedData.profile.name, seedData.profile.email, seedData.profile.education,
         seedData.profile.links.github, seedData.profile.links.linkedin, seedData.profile.links.portfolio]);

    // Insert skills
    seedData.skills.forEach(skill => {
        db.run('INSERT OR IGNORE INTO skills (name) VALUES (?)', [skill]);
    });

    // Insert work
    seedData.work.forEach((w, i) => {
        db.run('INSERT INTO work (description, sort_order) VALUES (?, ?)', [w, i]);
    });

    // Insert projects
    seedData.projects.forEach(project => {
        db.run('INSERT INTO projects (title, description) VALUES (?, ?)', [project.title, project.description]);
        const projectId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];
        
        project.links.forEach(link => {
            db.run('INSERT INTO project_links (project_id, url) VALUES (?, ?)', [projectId, link]);
        });
        
        project.skills.forEach(skillName => {
            db.run('INSERT OR IGNORE INTO skills (name) VALUES (?)', [skillName]);
            const skillResult = db.exec('SELECT id FROM skills WHERE name = ?', [skillName]);
            if (skillResult.length && skillResult[0].values.length) {
                const skillId = skillResult[0].values[0][0];
                db.run('INSERT OR IGNORE INTO project_skills (project_id, skill_id) VALUES (?, ?)', [projectId, skillId]);
            }
        });
    });
    
    console.log('Database seeded successfully!');
}

function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
    }
}

function getDb() {
    return db;
}

function save() {
    saveDatabase();
}

module.exports = { initDatabase, getDb, save };
