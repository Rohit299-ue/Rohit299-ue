# Me-API Playground

A full-stack REST API application that stores a personal candidate profile in a relational database and exposes it through a clean API interface. Includes a minimal frontend for querying and displaying data.

## Architecture

```
┌─────────────────┐         HTTP/REST         ┌─────────────────┐         SQL          ┌─────────────────┐
│                 │ ───────────────────────►  │                 │ ──────────────────►  │                 │
│    Frontend     │                           │    Backend      │                      │    Database     │
│   (HTML/JS)     │  ◄───────────────────────  │   (Express)     │  ◄──────────────────  │    (SQLite)     │
│                 │         JSON              │                 │        Results       │                 │
└─────────────────┘                           └─────────────────┘                      └─────────────────┘
```

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | HTML5, CSS3, Vanilla JS | Query interface for API |
| Backend | Node.js, Express.js | REST API server with CORS |
| Database | SQLite via sql.js | Persistent data storage |

## API Reference

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check — returns `{ "status": "ok" }` |
| `GET` | `/profile` | Retrieve complete profile with skills, projects, and work history |
| `POST` | `/profile` | Create new profile (returns 409 if exists) |
| `PUT` | `/profile` | Update existing profile fields |
| `GET` | `/projects` | List all projects |
| `GET` | `/projects?skill=python` | Filter projects by skill (case-insensitive, partial match) |
| `GET` | `/skills/top` | Get top 5 skills ranked by project count |
| `GET` | `/search?q=java` | Search across skills, projects, and work experience |

### Response Format

All endpoints return JSON. Successful responses return data directly; errors return `{ "error": "message" }`.

## Local Development

### Prerequisites
- Node.js 18 or higher
- npm

### Quick Start

```bash
# Clone and navigate to backend
cd backend

# Install dependencies
npm install

# Start server (auto-seeds database on first run)
npm start
```

Server runs at `http://localhost:3000`. The database initializes automatically with seed data if no existing database is found.

### Frontend

Open `frontend/index.html` directly in a browser, or serve it locally:

```bash
npx serve frontendnpx serve frontend
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `DATABASE_PATH` | `./data/meapi.db` | SQLite database file location |

## Deployment

### Backend — Render

1. Create a new **Web Service** on [Render](https://render.com)
2. Connect your GitHub repository
3. Configure build settings:

| Setting | Value |
|---------|-------|
| Root Directory | `backend` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Environment | Node |

4. Deploy. The database auto-seeds on first startup.

### Frontend — Vercel / Netlify / GitHub Pages

1. Deploy the `frontend` folder as a static site
2. Update `API_BASE` in `frontend/app.js` with your Render backend URL

## Database Schema

### Entity Relationship

```
profile (1) ──────────────────────────────────────────────────────────────
                                                                          
skills (N) ◄────────────► projects (N)    [many-to-many via project_skills]
                               │
                               ▼
                         project_links (N)  [one-to-many]
                               
work (N) ─────────────────────────────────────────────────────────────────
```

### Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `profile` | Candidate info (single row) | name, email, education, links_* |
| `skills` | Normalized skill names | name (UNIQUE) |
| `projects` | Project entries | title, description |
| `project_links` | Project URLs | project_id (FK), url |
| `project_skills` | Project-skill mapping | project_id, skill_id (composite PK) |
| `work` | Work experience | description, sort_order |

### Indexes

- `idx_skills_name` — Fast skill lookups
- `idx_projects_title` — Project title search
- `idx_project_skills_skill` — Efficient skill-based project filtering

## API Usage Examples

### Health Check
```bash
curl http://localhost:3000/health
# Response: {"status":"ok"}
```

### Get Profile
```bash
curl http://localhost:3000/profile
```

### Create Profile
```bash
curl -X POST http://localhost:3000/profile \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rohit Rohan Tripathy",
    "email": "rohit@example.com",
    "education": "MCA, Bhubaneswar",
    "skills": ["JavaScript", "Python", "Node.js"],
    "links": {
      "github": "https://github.com/Rohit299-ue",
      "linkedin": "https://linkedin.com/in/rohit-rohan-tripathy-07a8ab213"
    }
  }'
```

### Update Profile
```bash
curl -X PUT http://localhost:3000/profile \
  -H "Content-Type: application/json" \
  -d '{"education": "MCA, OUAT Bhubaneswar"}'
```

### Filter Projects by Skill
```bash
curl "http://localhost:3000/projects?skill=python"
```

### Get Top Skills
```bash
curl http://localhost:3000/skills/top
# Response: [{"name":"JavaScript","project_count":2}, ...]
```

### Search
```bash
curl "http://localhost:3000/search?q=api"
# Returns matching skills, projects, and work entries
```

## Technical Decisions

### Why sql.js instead of native SQLite?

| Consideration | sql.js | better-sqlite3 |
|---------------|--------|----------------|
| Native dependencies | None (pure JS/WASM) | Requires C++ compilation |
| Cross-platform | Works everywhere | Build issues on some systems |
| Performance | Slightly slower | Faster for large datasets |
| Deployment | Zero-config | May fail on serverless platforms |

For a single-user demo application, sql.js provides hassle-free deployment without sacrificing functionality.

### Data Persistence on Render

Render's free tier uses ephemeral storage. The database file is lost on redeploy. This is handled by auto-seeding: if no database exists at startup, one is created with default profile data. For production use, consider Render's persistent disks or an external database service.

## Known Limitations

- Single profile by design (id constrained to 1)
- No authentication on write endpoints
- No pagination on list endpoints
- Database resets on Render redeploy (auto-seeds with default data)
- Frontend requires manual API URL update for production

## Live URLs

| Resource | URL |
|----------|-----|
| Backend API | https://rohit299-ue.onrender.com |
| Frontend | *Deploy to Vercel/Netlify* |
| Source Code | https://github.com/Rohit299-ue/me-api-playground |
| Resume/LinkedIn | https://www.linkedin.com/in/rohit-rohan-tripathy-07a8ab213 |

## Author

**Rohit Rohan Tripathy**  
MCA, Bhubaneswar  
[GitHub](https://github.com/Rohit299-ue) · [LinkedIn](https://www.linkedin.com/in/rohit-rohan-tripathy-07a8ab213)

## License

MIT
