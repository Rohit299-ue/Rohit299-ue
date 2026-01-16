// API Base URL - Change this to your deployed backend URL
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://me-api-backend-tuvm.onrender.com';

// Helper function for API calls
async function apiCall(endpoint) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Health Check
document.getElementById('check-health').addEventListener('click', async () => {
    const statusEl = document.getElementById('health-status');
    statusEl.textContent = 'Checking...';
    statusEl.className = '';
    
    try {
        const data = await apiCall('/health');
        statusEl.textContent = `Status: ${data.status}`;
        statusEl.className = 'ok';
    } catch (error) {
        statusEl.textContent = 'Error: API unreachable';
        statusEl.className = 'error';
    }
});

// Load Profile
document.getElementById('load-profile').addEventListener('click', async () => {
    const container = document.getElementById('profile-data');
    container.innerHTML = '<p class="loading">Loading...</p>';
    
    try {
        const profile = await apiCall('/profile');
        container.innerHTML = renderProfile(profile);
    } catch (error) {
        container.innerHTML = `<p class="error">Error loading profile: ${error.message}</p>`;
    }
});

function renderProfile(profile) {
    return `
        <div class="profile-card">
            <h3>${profile.name}</h3>
            <p><strong>Email:</strong> ${profile.email}</p>
            <p><strong>Education:</strong> ${profile.education || 'N/A'}</p>
            
            <div class="links-section">
                <h4>Links</h4>
                ${profile.links.github ? `<a href="${profile.links.github}" target="_blank">GitHub</a>` : ''}
                ${profile.links.linkedin ? `<a href="${profile.links.linkedin}" target="_blank">LinkedIn</a>` : ''}
                ${profile.links.portfolio ? `<a href="${profile.links.portfolio}" target="_blank">Portfolio</a>` : ''}
            </div>
            
            <div style="margin-top: 15px;">
                <h4>Skills</h4>
                ${profile.skills.map(s => `<span class="skill-tag">${s}</span>`).join('')}
            </div>
            
            <div style="margin-top: 15px;">
                <h4>Work Experience</h4>
                ${profile.work.map(w => `<div class="work-item">${w}</div>`).join('')}
            </div>
            
            <div style="margin-top: 15px;">
                <h4>Projects (${profile.projects.length})</h4>
                ${profile.projects.map(renderProject).join('')}
            </div>
        </div>
    `;
}

function renderProject(project) {
    return `
        <div class="project-card">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <h4>${project.title}</h4>
                ${project.id ? `<button onclick="deleteProject(${project.id})" style="background: #dc3545; padding: 6px 12px; font-size: 0.85em;">🗑️ Delete</button>` : ''}
            </div>
            <p>${project.description || ''}</p>
            <div>
                ${project.links?.map(l => `<a href="${l}" target="_blank">View</a>`).join('') || ''}
            </div>
            <div>
                ${project.skills?.map(s => `<span class="skill-tag">${s}</span>`).join('') || ''}
            </div>
        </div>
    `;
}

// Search
document.getElementById('search-btn').addEventListener('click', performSearch);
document.getElementById('search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
});

async function performSearch() {
    const query = document.getElementById('search-input').value.trim();
    const container = document.getElementById('search-results');
    
    if (!query) {
        container.innerHTML = '<p class="error">Please enter a search term</p>';
        return;
    }
    
    container.innerHTML = '<p class="loading">Searching...</p>';
    
    try {
        const data = await apiCall(`/search?q=${encodeURIComponent(query)}`);
        container.innerHTML = renderSearchResults(data);
    } catch (error) {
        container.innerHTML = `<p class="error">Search error: ${error.message}</p>`;
    }
}

function renderSearchResults(data) {
    const { results } = data;
    let html = `<p>Results for "<strong>${data.query}</strong>":</p>`;
    
    if (results.skills.length) {
        html += `
            <div class="search-result-section">
                <h4>Skills (${results.skills.length})</h4>
                ${results.skills.map(s => `<span class="skill-tag">${s}</span>`).join('')}
            </div>
        `;
    }
    
    if (results.projects.length) {
        html += `
            <div class="search-result-section">
                <h4>Projects (${results.projects.length})</h4>
                ${results.projects.map(renderProject).join('')}
            </div>
        `;
    }
    
    if (results.work.length) {
        html += `
            <div class="search-result-section">
                <h4>Work Experience (${results.work.length})</h4>
                ${results.work.map(w => `<div class="work-item">${w}</div>`).join('')}
            </div>
        `;
    }
    
    if (!results.skills.length && !results.projects.length && !results.work.length) {
        html += '<p>No results found.</p>';
    }
    
    return html;
}

// Filter Projects
document.getElementById('filter-projects').addEventListener('click', () => loadProjects(true));
document.getElementById('load-all-projects').addEventListener('click', () => loadProjects(false));
document.getElementById('skill-filter').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loadProjects(true);
});

async function loadProjects(withFilter) {
    const container = document.getElementById('projects-data');
    const skill = document.getElementById('skill-filter').value.trim();
    
    container.innerHTML = '<p class="loading">Loading...</p>';
    
    try {
        const endpoint = withFilter && skill ? `/projects?skill=${encodeURIComponent(skill)}` : '/projects';
        const projects = await apiCall(endpoint);
        
        if (projects.length === 0) {
            container.innerHTML = '<p>No projects found.</p>';
        } else {
            container.innerHTML = projects.map(renderProject).join('');
        }
    } catch (error) {
        container.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    }
}

// Top Skills
document.getElementById('load-top-skills').addEventListener('click', async () => {
    const container = document.getElementById('skills-data');
    container.innerHTML = '<p class="loading">Loading...</p>';
    
    try {
        const skills = await apiCall('/skills/top');
        container.innerHTML = skills.map(s => `
            <div class="skill-stat">
                <span>${s.name}</span>
                <span>${s.project_count} project(s)</span>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    }
});

// Add Project Form
document.getElementById('show-add-project').addEventListener('click', () => {
    document.getElementById('add-project-form').style.display = 'block';
});

document.getElementById('cancel-project').addEventListener('click', () => {
    document.getElementById('add-project-form').style.display = 'none';
    clearProjectForm();
});

document.getElementById('submit-project').addEventListener('click', async () => {
    const title = document.getElementById('project-title').value.trim();
    const description = document.getElementById('project-description').value.trim();
    const linksStr = document.getElementById('project-links').value.trim();
    const skillsStr = document.getElementById('project-skills').value.trim();
    
    if (!title) {
        alert('Project title is required');
        return;
    }
    
    const links = linksStr ? linksStr.split(',').map(l => l.trim()).filter(l => l) : [];
    const skills = skillsStr ? skillsStr.split(',').map(s => s.trim()).filter(s => s) : [];
    
    try {
        const response = await fetch(`${API_BASE}/api/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description, links, skills })
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        alert('Project added successfully!');
        document.getElementById('add-project-form').style.display = 'none';
        clearProjectForm();
        loadProjects(false); // Reload all projects
    } catch (error) {
        alert(`Error adding project: ${error.message}`);
    }
});

function clearProjectForm() {
    document.getElementById('project-title').value = '';
    document.getElementById('project-description').value = '';
    document.getElementById('project-links').value = '';
    document.getElementById('project-skills').value = '';
}

// Delete Project
async function deleteProject(projectId) {
    if (!confirm('Are you sure you want to delete this project?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/api/projects/${projectId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        alert('Project deleted successfully!');
        loadProjects(false); // Reload all projects
    } catch (error) {
        alert(`Error deleting project: ${error.message}`);
    }
}

// Auto-check health on load
window.addEventListener('load', () => {
    document.getElementById('check-health').click();
});
