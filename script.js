document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let state = {
        currentView: 'dashboard',
        activities: JSON.parse(localStorage.getItem('activities')) || [],
        goals: JSON.parse(localStorage.getItem('goals')) || [
            { id: 1, goalType: 'weeklySteps', name: 'Weekly Steps', target: 20000, current: 0, unit: 'steps (est.)', activityTypeFilter: null },
            { id: 2, goalType: 'runSessions', name: 'Run 3x a Week', target: 3, current: 0, unit: 'sessions', activityTypeFilter: 'Running' },
            { id: 3, goalType: 'weeklyCalories', name: 'Burn 2500 Calories', target: 2500, current: 0, unit: 'kcal this week', activityTypeFilter: null },
        ],
        // Achievements now start as locked by default
        achievements: JSON.parse(localStorage.getItem('achievements')) || [
            { id: 1, name: 'First 5k', description: 'Completed your first 5 kilometer run!', unlocked: false, icon: '🏃' },
            { id: 2, name: '7-Day Streak', description: 'Worked out 7 days in a row!', unlocked: false, icon: '🔥' },
            { id: 3, name: 'Early Bird', description: 'Completed a workout before 7 AM.', unlocked: false, icon: '☀️' },
            { id: 4, name: 'Marathon Ready', description: 'Logged over 42km in a month.', unlocked: false, icon: '🏁' },
        ],
        editingActivityId: null
    };

    const ACTIVITY_TYPES = ["Running", "Walking", "Cycling", "Weight Training", "Yoga", "Swimming", "HIIT", "Sports", "Other"];

    // --- DOM ELEMENT SELECTORS ---
    const views = {
        dashboard: document.getElementById('dashboard-view'),
        goals: document.getElementById('goals-view'),
        achievements: document.getElementById('achievements-view'),
    };
    const navItems = document.querySelectorAll('.nav-item');
    const fabLogActivity = document.getElementById('fab-log-activity');
    const logActivityModal = document.getElementById('log-activity-modal');
    const logActivityForm = document.getElementById('log-activity-form');
    const closeLogActivityModalBtn = document.getElementById('close-log-activity-modal');
    const addGoalModal = document.getElementById('add-goal-modal');
    const addGoalForm = document.getElementById('add-goal-form');
    const closeAddGoalModalBtn = document.getElementById('close-add-goal-modal');
    const dashboardTemplate = document.getElementById('dashboard-template');
    const activityItemTemplate = document.getElementById('activity-item-template');
    const goalsTemplate = document.getElementById('goals-template');
    const goalItemTemplate = document.getElementById('goal-item-template');
    const achievementsTemplate = document.getElementById('achievements-template');
    const achievementItemTemplate = document.getElementById('achievement-item-template');

    // --- STATE PERSISTENCE ---
    const saveState = () => {
        const goalsToSave = JSON.parse(JSON.stringify(state.goals));
        goalsToSave.forEach(goal => { goal.current = 0; });
        localStorage.setItem('activities', JSON.stringify(state.activities));
        localStorage.setItem('goals', JSON.stringify(goalsToSave));
        localStorage.setItem('achievements', JSON.stringify(state.achievements));
    };

    // --- ACHIEVEMENT LOGIC ---
    const checkAchievements = (newActivity) => {
        // --- 1. First 5k Achievement ---
        const first5k = state.achievements.find(ach => ach.id === 1);
        if (first5k && !first5k.unlocked) {
            if (newActivity.type === 'Running' && newActivity.distance >= 5) {
                first5k.unlocked = true;
                alert("Achievement Unlocked: First 5k! 🎉");
            }
        }

        // --- 2. 7-Day Streak Achievement ---
        const sevenDayStreak = state.achievements.find(ach => ach.id === 2);
        if (sevenDayStreak && !sevenDayStreak.unlocked) {
            const uniqueWorkoutDays = [...new Set(state.activities.map(act => act.date))].sort();
            if (uniqueWorkoutDays.length >= 7) {
                let consecutiveDays = 0;
                let maxStreak = 0;
                for (let i = 0; i < uniqueWorkoutDays.length - 1; i++) {
                    const currentDay = new Date(uniqueWorkoutDays[i]);
                    const nextDay = new Date(uniqueWorkoutDays[i+1]);
                    const diffTime = nextDay - currentDay;
                    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                    if (diffDays === 1) {
                        consecutiveDays++;
                    } else {
                        consecutiveDays = 0;
                    }
                    if (consecutiveDays > maxStreak) {
                        maxStreak = consecutiveDays;
                    }
                }
                // The streak is the number of connections, so add 1 to get the number of days
                if ((maxStreak + 1) >= 7) {
                    sevenDayStreak.unlocked = true;
                    alert("Achievement Unlocked: 7-Day Streak! 🔥");
                }
            }
        }

        // --- 3. Early Bird Achievement ---
        const earlyBird = state.achievements.find(ach => ach.id === 3);
        if (earlyBird && !earlyBird.unlocked && newActivity.time) {
            const hour = parseInt(newActivity.time.split(':')[0]);
            if (hour < 7) {
                earlyBird.unlocked = true;
                alert("Achievement Unlocked: Early Bird! ☀️");
            }
        }
        
        // You can add more achievement checks here, like the "Marathon Ready" one.
    };

    // --- RENDER FUNCTIONS ---
    const renderDashboard = () => {
        const dashboardContent = dashboardTemplate.content.cloneNode(true);
        const totalWorkoutsEl = dashboardContent.getElementById('total-workouts');
        const totalCaloriesEl = dashboardContent.getElementById('total-calories');
        const avgDurationEl = dashboardContent.getElementById('avg-duration');
        const recentActivitiesList = dashboardContent.getElementById('recent-activities-list');
        const noActivitiesMsg = dashboardContent.getElementById('no-activities-msg');
        const resetBtn = dashboardContent.getElementById('reset-activities-btn');
        const totalWorkouts = state.activities.length;
        const totalCalories = state.activities.reduce((sum, act) => sum + (act.calories || 0), 0);
        const avgDuration = totalWorkouts > 0 ? (state.activities.reduce((sum, act) => sum + (act.duration || 0), 0) / totalWorkouts).toFixed(0) : 0;
        totalWorkoutsEl.textContent = totalWorkouts;
        totalCaloriesEl.textContent = totalCalories.toLocaleString();
        avgDurationEl.textContent = avgDuration;
        recentActivitiesList.innerHTML = '';
        if (state.activities.length > 0) {
            noActivitiesMsg.classList.add('hidden');
            resetBtn.classList.remove('hidden');
            const sortedActivities = [...state.activities].sort((a, b) => new Date(b.date) - new Date(a.date));
            sortedActivities.slice(0, 5).forEach(activity => {
                const item = activityItemTemplate.content.cloneNode(true);
                const li = item.querySelector('li');
                li.dataset.id = activity.id;
                let details = `${activity.duration} min`;
                if (activity.distance) details += ` / ${activity.distance} km`;
                if (activity.calories > 0) details += ` / ${activity.calories} kcal`;
                item.querySelector('.activity-type').textContent = activity.type;
                item.querySelector('.activity-details').textContent = details;
                item.querySelector('.activity-date').textContent = new Date(activity.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
                recentActivitiesList.appendChild(item);
            });
        } else {
            noActivitiesMsg.classList.remove('hidden');
            resetBtn.classList.add('hidden');
        }
        views.dashboard.innerHTML = '';
        views.dashboard.appendChild(dashboardContent);
        document.getElementById('reset-activities-btn').addEventListener('click', handleResetActivities);
        document.getElementById('recent-activities-list').addEventListener('click', handleActivityListClick);
    };
    const renderGoals = () => {
        const goalsContent = goalsTemplate.content.cloneNode(true);
        views.goals.innerHTML = '';
        views.goals.appendChild(goalsContent);
        const goalsList = document.getElementById('goals-list');
        const noGoalsMsg = document.getElementById('no-goals-msg');
        goalsList.innerHTML = '';
        if (state.goals.length > 0) {
            noGoalsMsg.classList.add('hidden');
            state.goals.forEach(goal => {
                const item = goalItemTemplate.content.cloneNode(true);
                const li = item.querySelector('li');
                li.dataset.id = goal.id;
                const progress = goal.target > 0 ? Math.min((goal.current / goal.target) * 100, 100) : 0;
                item.querySelector('.goal-name').textContent = goal.name;
                item.querySelector('.goal-current').textContent = goal.current.toLocaleString();
                item.querySelector('.goal-unit').textContent = goal.unit;
                const targetInput = item.querySelector('.goal-target-input');
                targetInput.value = goal.target;
                item.querySelector('.goal-progress-bar').style.width = `${progress}%`;
                if (progress >= 100) item.querySelector('.goal-achieved-msg').classList.remove('hidden');
                goalsList.appendChild(item);
            });
        } else noGoalsMsg.classList.remove('hidden');
        document.getElementById('add-new-goal-btn').addEventListener('click', () => showAddGoalModal());
        goalsList.addEventListener('change', handleGoalTargetChange);
        goalsList.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.classList.contains('goal-target-input')) e.target.blur();
        });
    };
    const renderAchievements = () => {
        const achievementsContent = achievementsTemplate.content.cloneNode(true);
        views.achievements.innerHTML = '';
        views.achievements.appendChild(achievementsContent);
        const grid = document.getElementById('achievements-grid');
        const noAchievementsMsg = document.getElementById('no-achievements-msg');
        grid.innerHTML = '';
        if (state.achievements.length > 0) {
            noAchievementsMsg.classList.add('hidden');
            state.achievements.forEach(ach => {
                const item = achievementItemTemplate.content.cloneNode(true);
                const container = item.querySelector('div');
                const iconContainer = item.querySelector('.achievement-icon');
                iconContainer.textContent = ach.icon;
                item.querySelector('.achievement-name').textContent = ach.name;
                if (ach.unlocked) {
                    container.classList.add('bg-gradient-to-br', 'from-yellow-500', 'to-amber-600', 'text-white', 'hover:shadow-yellow-400/40');
                    item.querySelector('.achievement-desc').textContent = ach.description;
                    item.querySelector('.achievement-name').classList.add('text-white');
                } else {
                    container.classList.add('bg-slate-800', 'text-slate-400', 'hover:bg-slate-700');
                    iconContainer.classList.add('opacity-50');
                    item.querySelector('.achievement-desc').textContent = 'Locked';
                    item.querySelector('.achievement-name').classList.add('text-slate-300');
                }
                grid.appendChild(item);
            });
        } else noAchievementsMsg.classList.remove('hidden');
    };
    const renderView = () => {
        Object.values(views).forEach(view => view.classList.add('hidden'));
        if (views[state.currentView]) views[state.currentView].classList.remove('hidden');
        switch(state.currentView) {
            case 'dashboard': renderDashboard(); break;
            case 'goals': renderGoals(); break;
            case 'achievements': renderAchievements(); break;
        }
        navItems.forEach(item => {
            const isModalTrigger = item.dataset.view.endsWith('_modal');
            const isActive = item.dataset.view === state.currentView && !isModalTrigger;
            item.classList.toggle('bg-sky-500', isActive);
            item.classList.toggle('text-white', isActive);
            item.classList.toggle('scale-105', isActive);
            item.classList.toggle('text-slate-400', !isActive);
            item.classList.toggle('hover:bg-slate-700', !isActive);
            item.classList.toggle('hover:text-sky-300', !isActive);
        });
    };
    const recalculateGoalProgress = () => {
        const getStartOfWeek = (inputDate) => {
            const date = new Date(inputDate.valueOf());
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(date.setDate(diff));
            monday.setHours(0, 0, 0, 0);
            return monday;
        };
        const currentDate = new Date();
        const startOfThisWeek = getStartOfWeek(currentDate);
        const endOfToday = new Date(currentDate);
        endOfToday.setHours(23, 59, 59, 999);
        const weeklyActivities = state.activities.filter(act => {
            const [year, month, day] = act.date.split('-').map(Number);
            const activityDate = new Date(year, month - 1, day);
            return activityDate >= startOfThisWeek && activityDate <= endOfToday;
        });
        state.goals = state.goals.map(goal => {
            let activitiesToConsider = weeklyActivities;
            if (goal.activityTypeFilter) activitiesToConsider = weeklyActivities.filter(act => act.type === goal.activityTypeFilter);
            let currentProgress = 0;
            switch (goal.goalType) {
                case 'weeklySteps':
                    currentProgress = weeklyActivities.reduce((sum, act) => {
                        if (act.type === 'Running') return sum + (act.duration || 0) * 150;
                        if (act.type === 'Walking') return sum + (act.duration || 0) * 125;
                        return sum;
                    }, 0);
                    currentProgress = Math.round(currentProgress);
                    break;
                case 'runSessions':
                case 'activityCount':
                    currentProgress = activitiesToConsider.length;
                    break;
                case 'totalDuration':
                    currentProgress = activitiesToConsider.reduce((sum, act) => sum + (act.duration || 0), 0);
                    break;
                case 'totalDistance':
                    currentProgress = activitiesToConsider.reduce((sum, act) => sum + (act.distance || 0), 0);
                    currentProgress = Math.round(currentProgress * 100) / 100;
                    break;
                case 'weeklyCalories':
                    currentProgress = weeklyActivities.reduce((sum, act) => sum + (act.calories || 0), 0);
                    break;
                default:
                    currentProgress = goal.current;
                    break;
            }
            return { ...goal, current: currentProgress };
        });
    };
    const getLocalISODateString = (date) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const handleNavClick = (e) => {
        const targetButton = e.target.closest('.nav-item');
        if (!targetButton) return;
        const view = targetButton.dataset.view;
        if (view === 'log_activity_modal') showLogActivityModal();
        else {
            state.currentView = view;
            renderView();
        }
    };
    const showLogActivityModal = (activityToEdit = null) => {
        const form = logActivityForm;
        form.reset();
        const typeSelect = form.querySelector('#activityType');
        typeSelect.innerHTML = ACTIVITY_TYPES.map(type => `<option value="${type}">${type}</option>`).join('');
        const modalTitle = document.getElementById('log-activity-modal-title');
        const submitBtn = document.getElementById('log-activity-submit-btn');
        if (activityToEdit) {
            state.editingActivityId = activityToEdit.id;
            modalTitle.textContent = 'Edit Activity';
            submitBtn.textContent = 'Update Activity';
            form.querySelector('[name="type"]').value = activityToEdit.type;
            form.querySelector('[name="duration"]').value = activityToEdit.duration;
            form.querySelector('[name="distance"]').value = activityToEdit.distance || '';
            form.querySelector('[name="calories"]').value = activityToEdit.calories || '';
            form.querySelector('[name="date"]').value = activityToEdit.date;
            // Also populate the time field if it exists on the activity
            form.querySelector('[name="time"]').value = activityToEdit.time || '';
        } else {
            state.editingActivityId = null;
            modalTitle.textContent = 'Log New Activity';
            submitBtn.textContent = 'Log Activity';
            form.querySelector('[name="date"]').value = getLocalISODateString(new Date());
            // Set default time to current local time
            form.querySelector('[name="time"]').value = new Date().toTimeString().slice(0,5);
        }
        logActivityModal.classList.remove('hidden');
    };
    const handleLogActivitySubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(logActivityForm);
        const activityData = {
            type: formData.get('type'),
            duration: parseInt(formData.get('duration')) || 0,
            distance: formData.get('distance') ? parseFloat(formData.get('distance')) : null,
            calories: formData.get('calories') ? parseInt(formData.get('calories')) : 0,
            date: formData.get('date'),
            time: formData.get('time') // Get the new time value from the form
        };
        if (state.editingActivityId) {
            state.activities = state.activities.map(act => act.id === state.editingActivityId ? { ...act, ...activityData } : act);
        } else {
            activityData.id = Date.now();
            state.activities.push(activityData);
        }
        // Check for new achievements based on this latest activity
        checkAchievements(activityData);

        recalculateGoalProgress();
        saveState();
        logActivityModal.classList.add('hidden');
        renderView();
    };
    const handleResetActivities = () => {
        if (confirm("Are you sure you want to delete all logged activities? This action cannot be undone.")) {
            state.activities = [];
            // Reset achievements as well
            state.achievements.forEach(ach => ach.unlocked = false);
            recalculateGoalProgress();
            saveState();
            renderView();
        }
    };
    const handleActivityListClick = (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        const li = target.closest('li');
        const activityId = parseInt(li.dataset.id);
        if (target.classList.contains('edit-btn')) {
            const activityToEdit = state.activities.find(act => act.id === activityId);
            if (activityToEdit) showLogActivityModal(activityToEdit);
        } else if (target.classList.contains('delete-btn')) {
            if (confirm("Are you sure you want to delete this activity?")) {
                state.activities = state.activities.filter(act => act.id !== activityId);
                // After deleting, we need to re-check all achievements from scratch
                recalculateGoalProgress();
                // We'll also re-check achievements upon deletion in case it breaks a streak
                state.achievements.forEach(ach => ach.unlocked = false); // Reset all
                state.activities.forEach(act => checkAchievements(act)); // Re-check all
                saveState();
                renderView();
            }
        }
    };
    const showAddGoalModal = () => {
        addGoalForm.reset();
        const filterSelect = addGoalForm.querySelector('#activityTypeFilter');
        const filterOptions = ['All', ...ACTIVITY_TYPES];
        filterSelect.innerHTML = filterOptions.map(type => `<option value="${type}">${type}</option>`).join('');
        addGoalModal.classList.remove('hidden');
    };
    const handleAddGoalSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(addGoalForm);
        const name = formData.get('name').trim();
        const target = parseInt(formData.get('target'));
        const unit = formData.get('unit').trim();
        if (!name || isNaN(target) || target <= 0 || !unit) {
            alert("Please fill in a valid Name, Target (positive number), and Unit.");
            return;
        }
        const newGoal = {
            id: Date.now(),
            goalType: formData.get('goalType'),
            name: name,
            target: target,
            current: 0,
            unit: unit,
            activityTypeFilter: formData.get('activityTypeFilter') === 'All' ? null : formData.get('activityTypeFilter'),
        };
        state.goals.push(newGoal);
        recalculateGoalProgress();
        saveState();
        addGoalModal.classList.add('hidden');
        renderView(); 
    };
    const handleGoalTargetChange = (e) => {
        const input = e.target;
        if (!input.classList.contains('goal-target-input')) return;
        const li = input.closest('li');
        const goalId = parseInt(li.dataset.id);
        let newTarget = parseInt(input.value, 10);
        if (isNaN(newTarget) || newTarget < 0) {
            const oldGoal = state.goals.find(g => g.id === goalId);
            input.value = oldGoal.target;
            return;
        }
        state.goals = state.goals.map(goal => {
            if (goal.id === goalId) {
                let newName = goal.name;
                if (goal.goalType === 'runSessions') newName = `Run ${newTarget}x a Week`;
                else if (goal.goalType === 'weeklyCalories') newName = `Burn ${newTarget.toLocaleString()} Calories`;
                return { ...goal, target: newTarget, name: newName };
            }
            return goal;
        });
        recalculateGoalProgress();
        saveState();
        renderView();
    };
    const init = () => {
        document.getElementById('bottom-nav').addEventListener('click', handleNavClick);
        fabLogActivity.addEventListener('click', () => showLogActivityModal());
        logActivityForm.addEventListener('submit', handleLogActivitySubmit);
        closeLogActivityModalBtn.addEventListener('click', () => logActivityModal.classList.add('hidden'));
        addGoalForm.addEventListener('submit', handleAddGoalSubmit);
        closeAddGoalModalBtn.addEventListener('click', () => addGoalModal.classList.add('hidden'));
        
        // On initial load, re-check all achievements based on the stored activity list
        state.achievements.forEach(ach => ach.unlocked = false); // Reset first
        state.activities.forEach(act => checkAchievements(act)); // Then re-evaluate
        
        recalculateGoalProgress();
        renderView();
    };
    init();
});