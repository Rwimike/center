// Simulación de Base de Datos
class TaskDatabase {
    constructor() {
        this.tasks = [];
        this.completedTasks = 0;
    }

    async loadTasksFromJson() {
        const response = await fetch('db.json');
        const data = await response.json();
        // Convierte createdAt a Date
        this.tasks = data.map(task => ({
            ...task,
            createdAt: new Date(task.createdAt)
        }));
    }

    async getAllTasks() {
        if (this.tasks.length === 0) {
            await this.loadTasksFromJson();
        }
        return [...this.tasks];
    }

    async updateTask(id, updates) {
        const taskIndex = this.tasks.findIndex(task => task.id === id);
        if (taskIndex !== -1) {
            this.tasks[taskIndex] = { ...this.tasks[taskIndex], ...updates };
            return this.tasks[taskIndex];
        }
        throw new Error('Task not found');
    }

    async addTask(task) {
        const newTask = {
            id: Date.now(),
            ...task,
            createdAt: new Date(),
            completed: false
        };
        this.tasks.push(newTask);
        return newTask;
    }

    async deleteTask(id) {
        this.tasks = this.tasks.filter(task => task.id !== id);
        return true;
    }

    getStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(task => task.completed).length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { total, completed, percentage };
    }
}

// Clase principal de la aplicación
class TaskManager {
    constructor() {
        this.db = new TaskDatabase();
        this.tasks = [];
        this.currentFilter = 'all';
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadTasks();
        this.hideLoading();
        this.updateUI();
        this.startAutoRefresh();
    }

    setupEventListeners() {
        // Mobile menu
        document.getElementById('menuToggle').addEventListener('click', () => {
            this.toggleMobileMenu();
        });

        document.getElementById('overlay').addEventListener('click', () => {
            this.closeMobileMenu();
        });

        // Task controls
        document.getElementById('addTaskBtn').addEventListener('click', () => {
            this.showAddTaskModal();
        });

        document.getElementById('filterBtn').addEventListener('click', () => {
            this.toggleFilter();
        });

        // Window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                this.closeMobileMenu();
            }
        });
    }

    async loadTasks() {
        try {
            this.tasks = await this.db.getAllTasks();
        } catch (error) {
            console.error('Error loading tasks:', error);
            this.showNotification('Error al cargar las tareas', 'error');
        }
    }

    hideLoading() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('progressSection').style.display = 'block';
        document.getElementById('tasksSection').style.display = 'block';
    }

    updateUI() {
        this.updateProgress();
        this.updateTaskCount();
        this.renderTasks();
        this.updateProgressTime();
        renderCalendarFilter(this.tasks); // Aquí sí está bien
    }

    updateProgress() {
        const stats = this.db.getStats();
        const progressFill = document.getElementById('progressFill');
        const progressPercentage = document.getElementById('progressPercentage');
        const completedCount = document.getElementById('completedCount');
        const totalCount = document.getElementById('totalCount');

        // Animate progress bar
        setTimeout(() => {
            progressFill.style.width = `${stats.percentage}%`;
        }, 100);

        progressPercentage.textContent = `${stats.percentage}% completado`;
        completedCount.textContent = stats.completed;
        totalCount.textContent = stats.total;
    }

    updateTaskCount() {
        const stats = this.db.getStats();
        const remaining = stats.total - stats.completed;
        document.getElementById('taskCount').innerHTML = `
            <i class="fas fa-tasks"></i>
            ${remaining} tareas pendientes • ${stats.completed} completadas
        `;
    }

    updateProgressTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        document.getElementById('progressTime').textContent = `Actualizado a las ${timeString}`;
    }

    renderTasks() {
        const tasksGrid = document.getElementById('tasksGrid');
        const filteredTasks = this.getFilteredTasks();

        tasksGrid.innerHTML = '';

        if (filteredTasks.length === 0) {
            tasksGrid.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                    <i class="fas fa-check-circle" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
                    <p>No hay tareas que mostrar</p>
                </div>
            `;
            return;
        }

        filteredTasks.forEach((task, index) => {
            const taskElement = this.createTaskElement(task);
            taskElement.style.animationDelay = `${index * 50}ms`;
            taskElement.classList.add('fade-in');
            tasksGrid.appendChild(taskElement);
        });
    }

    createTaskElement(task) {
        const taskDiv = document.createElement('div');
        taskDiv.className = `task-item ${task.completed ? 'completed' : ''}`;
        taskDiv.dataset.taskId = task.id;

        const categoryColors = {
            'OmniMarketing': 'var(--accent-orange)',
            'Books': 'var(--accent-blue)',
            'Office': 'var(--accent-green)',
            'Shopping': 'var(--accent-purple)',
            'Social': 'var(--accent-red)',
            'Omni Meals 2.0': 'var(--accent-green)',
            'Vacation': 'var(--accent-blue)',
            'Cats': 'var(--accent-orange)',
            'Food iPad': 'var(--accent-green)',
            'Phone': 'var(--accent-red)',
            'Conference': 'var(--accent-purple)'
        };

        const timeIcon = task.dueTime.includes('Due') ? 'fas fa-clock' : 
                        task.dueTime.includes('-') ? 'fas fa-calendar-alt' : 
                        'fas fa-calendar-day';

        taskDiv.innerHTML = `
            <div class="task-header">
                <div class="task-checkbox ${task.completed ? 'completed' : ''}" 
                        onclick="taskManager.toggleTask(${task.id})"></div>
                <div class="task-content">
                    <div class="task-title">${task.title}</div>
                </div>
                <div class="task-priority priority-${task.priority}"></div>
            </div>
            <div class="task-meta">
                <div class="task-category" style="border-left: 3px solid ${categoryColors[task.category] || 'var(--accent-orange)'};">
                    ${task.category}
                </div>
                ${task.dueTime ? `
                    <div class="task-time">
                        <i class="${timeIcon}"></i>
                        ${task.dueTime}
                    </div>
                ` : ''}
            </div>
        `;

        return taskDiv;
    }

    getFilteredTasks() {
        switch (this.currentFilter) {
            case 'pending':
                return this.tasks.filter(task => !task.completed);
            case 'completed':
                return this.tasks.filter(task => task.completed);
            case 'high':
                return this.tasks.filter(task => task.priority === 'high');
            case 'today':
                return this.tasks.filter(task => task.dueTime.includes('Due'));
            default:
                return this.tasks;
        }
    }

    async toggleTask(taskId) {
        try {
            const task = this.tasks.find(t => t.id === taskId);
            if (!task) return;

            const updatedTask = await this.db.updateTask(taskId, {
                completed: !task.completed
            });

            // Update local state
            const taskIndex = this.tasks.findIndex(t => t.id === taskId);
            this.tasks[taskIndex] = updatedTask;

            // Update UI
            this.updateUI();
            
            // Show notification
            const message = updatedTask.completed ? 
                '¡Tarea completada!' : 'Tarea marcada como pendiente';
            this.showNotification(message, 'success');

        } catch (error) {
            console.error('Error updating task:', error);
            this.showNotification('Error al actualizar la tarea', 'error');
        }
    }

    toggleFilter() {
        const filters = ['all', 'pending', 'completed', 'high', 'today'];
        const currentIndex = filters.indexOf(this.currentFilter);
        const nextIndex = (currentIndex + 1) % filters.length;
        this.currentFilter = filters[nextIndex];

        const filterNames = {
            'all': 'Todas',
            'pending': 'Pendientes',
            'completed': 'Completadas',
            'high': 'Alta prioridad',
            'today': 'Hoy'
        };

        document.getElementById('filterBtn').innerHTML = `
            <i class="fas fa-filter"></i>
            ${filterNames[this.currentFilter]}
        `;

        this.renderTasks();
    }

    showAddTaskModal() {
        // Simple prompt for demo (in production, use a proper modal)
        const title = prompt('Título de la nueva tarea:');
        if (title) {
            const category = prompt('Categoría:', 'General');
            const priority = prompt('Prioridad (low/medium/high):', 'medium');
            
            this.addTask({
                title: title,
                category: category || 'General',
                priority: priority || 'medium',
                dueTime: ''
            });
        }
    }

    async addTask(taskData) {
        try {
            const newTask = await this.db.addTask(taskData);
            this.tasks.push(newTask);
            this.updateUI();
            this.showNotification('Tarea agregada exitosamente', 'success');
        } catch (error) {
            console.error('Error adding task:', error);
            this.showNotification('Error al agregar la tarea', 'error');
        }
    }

    toggleMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        
        sidebar.classList.toggle('visible');
        overlay.classList.toggle('visible');
    }

    closeMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        
        sidebar.classList.remove('visible');
        overlay.classList.remove('visible');
    }

    startAutoRefresh() {
        // Auto-refresh every 5 minutes
        setInterval(() => {
            this.updateProgressTime();
        }, 60000); // Update time every minute
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'var(--accent-green)' : 
                            type === 'error' ? 'var(--accent-red)' : 'var(--accent-blue)'};
            color: white;
            padding: 16px 24px;
            border-radius: var(--radius);
            box-shadow: var(--shadow);
            z-index: 10000;
            transform: translateX(100%);
            transition: var(--transition);
            font-weight: 500;
        `;
        
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 
                                type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
            ${message}
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

const daysOfWeek = [
    { key: 'L', name: 'Lunes', class: 'nav-bg-past' },
    { key: 'M', name: 'Martes', class: 'nav-bg-today' },
    { key: 'W', name: 'Miércoles', class: 'nav-bg-thu' },
    { key: 'J', name: 'Jueves', class: 'nav-bg-fri' },
    { key: 'V', name: 'Viernes', class: 'nav-bg-sat' },
    { key: 'S', name: 'Sábado', class: 'nav-bg-sun' },
    { key: 'D', name: 'Domingo', class: 'nav-bg-future' }
];

// Función para renderizar el calendario
async function renderCalendarFilter(tasks) {
    const calendar = document.getElementById('calendarFilter');
    calendar.innerHTML = '';

    // Cuenta tareas por día
    const counts = Array(7).fill(0);
    tasks.forEach(task => {
        const date = new Date(task.createdAt);
        const day = date.getDay(); // 0 = Domingo, 1 = Lunes, ...
        // Ajusta para que 0 sea Lunes y 6 Domingo
        const index = (day === 0) ? 6 : day - 1;
        counts[index]++;
    });

    daysOfWeek.forEach((day, i) => {
        const navItem = document.createElement('div');
        navItem.className = 'nav-item';

        const navIcon = document.createElement('div');
        navIcon.className = `nav-icon ${day.class}`;
        navIcon.textContent = counts[i];

        const navContent = document.createElement('div');
        navContent.className = 'nav-content';
        navContent.textContent = day.key;

        navItem.appendChild(navIcon);
        navItem.appendChild(navContent);
        calendar.appendChild(navItem);
    });
}

// Initialize the application
let taskManager;
document.addEventListener('DOMContentLoaded', () => {
    taskManager = new TaskManager();
});