// app.js - Main application logic

// User statistics
let userStats = {
    attempts: 0,
    hintsUsed: 0,
    correctAnswers: 0,
    currentStreak: 0,
    questionAttempts: 0,
    hintCount: 0,
    solvedWithoutHints: 0,
    firstTryCorrect: 0,
    errorsFound: 0,
    perfectCriticalAnalysis: 0,
    currentDependency: 0,
    subjectsCompleted: 0,
    completedSubjects: new Set()
};

// Current question
let currentQuestion = null;
let currentQuestionIndex = 0;
let currentCriticalQuestion = null;
let currentCriticalMode = 'find';

// Achievements and Skills
let achievements = [...achievementsDB];
let skills = [...skillsDB];

// Load data from localStorage
function loadProgress() {
    const savedStats = localStorage.getItem('aiEducationStats');
    const savedAchievements = localStorage.getItem('aiEducationAchievements');
    const savedSkills = localStorage.getItem('aiEducationSkills');

    if (savedStats) {
        const parsed = JSON.parse(savedStats);
        userStats = { ...userStats, ...parsed };
        if (parsed.completedSubjects) {
            userStats.completedSubjects = new Set(parsed.completedSubjects);
        }
    }

    if (savedAchievements) {
        achievements = JSON.parse(savedAchievements);
    }

    if (savedSkills) {
        skills = JSON.parse(savedSkills);
    }

    updateStats();
    updateAchievementsDisplay();
    updateSkillsDisplay();
}

// Save data to localStorage
function saveProgress() {
    const statsToSave = {
        ...userStats,
        completedSubjects: Array.from(userStats.completedSubjects)
    };
    localStorage.setItem('aiEducationStats', JSON.stringify(statsToSave));
    localStorage.setItem('aiEducationAchievements', JSON.stringify(achievements));
    localStorage.setItem('aiEducationSkills', JSON.stringify(skills));
}

// Navigation
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.dataset.page === pageId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    window.scrollTo(0, 0);

    // Update displays when entering progress page
    if (pageId === 'progress') {
        updateAchievementsDisplay();
        updateSkillsDisplay();
        updateProgressStats();
    }
}

// Navigation links
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        showPage(link.dataset.page);
    });
});

// Update topics based on subject
function updateTopics() {
    const subject = document.getElementById('subject').value;
    const topicSelect = document.getElementById('topic');
    const difficultySelect = document.getElementById('difficulty');
    
    topicSelect.innerHTML = '<option value="">-- Тақырып таңдаңыз --</option>';
    difficultySelect.disabled = true;
    document.getElementById('questionContainer').classList.add('hidden');
    
    if (subject && topicsData[subject]) {
        topicSelect.disabled = false;
        topicsData[subject].forEach(topic => {
            const option = document.createElement('option');
            option.value = topic.value;
            option.textContent = topic.text;
            topicSelect.appendChild(option);
        });
    } else {
        topicSelect.disabled = true;
    }
}

function updateDifficulty() {
    const topic = document.getElementById('topic').value;
    const difficultySelect = document.getElementById('difficulty');
    
    if (topic) {
        difficultySelect.disabled = false;
    } else {
        difficultySelect.disabled = true;
    }
    
    document.getElementById('questionContainer').classList.add('hidden');
}

function loadQuestion() {
    const subject = document.getElementById('subject').value;
    const topic = document.getElementById('topic').value;
    const difficulty = document.getElementById('difficulty').value;
    
    if (!subject || !topic || !difficulty) return;
    
    const questions = questionsDB[subject][topic][difficulty];
    if (!questions || questions.length === 0) {
        alert('Бұл тақырып үшін сұрақтар әлі қосылмаған');
        return;
    }
    
    currentQuestionIndex = Math.floor(Math.random() * questions.length);
    currentQuestion = questions[currentQuestionIndex];
    userStats.questionAttempts = 0;
    userStats.hintCount = 0;
    
    document.getElementById('questionNumber').textContent = `${currentQuestionIndex + 1} / ${questions.length}`;
    document.getElementById('questionText').textContent = currentQuestion.q;
    document.getElementById('answer').value = '';
    document.getElementById('feedback').className = 'feedback';
    document.getElementById('hintBox').className = 'hint-box';
    document.getElementById('questionContainer').classList.remove('hidden');

    // Track completed subject
    if (!userStats.completedSubjects.has(subject)) {
        userStats.completedSubjects.add(subject);
        userStats.subjectsCompleted = userStats.completedSubjects.size;
    }
}

function checkAnswer() {
    const userAnswer = document.getElementById('answer').value.trim();
    const feedback = document.getElementById('feedback');
    
    if (!userAnswer) {
        feedback.className = 'feedback error show';
        feedback.textContent = '⚠ Жауап енгізіңіз!';
        return;
    }
    
    userStats.attempts++;
    userStats.questionAttempts++;
    
    // Simple answer checking (case-insensitive, contains keywords)
    const correctAnswer = currentQuestion.a.toLowerCase();
    const userAnswerLower = userAnswer.toLowerCase();
    
    const isCorrect = userAnswerLower.includes(correctAnswer.substring(0, Math.min(10, correctAnswer.length))) || 
                     correctAnswer.includes(userAnswerLower.substring(0, Math.min(10, userAnswerLower.length)));
    
    if (isCorrect || userStats.questionAttempts >= 3) {
        if (isCorrect) {
            userStats.correctAnswers++;
            userStats.currentStreak++;
            
            // Track first try correct
            if (userStats.questionAttempts === 1) {
                userStats.firstTryCorrect++;
                addSkillXP('accuracy', 15);
            }
            
            // Track solved without hints
            if (userStats.hintCount === 0) {
                userStats.solvedWithoutHints++;
                addSkillXP('independence', 20);
            }
            
            feedback.className = 'feedback success show';
            feedback.innerHTML = `✓ Дұрыс! <br><small>Толық жауап: ${currentQuestion.a}</small>`;
            
            addSkillXP('problem_solving', 10);
            addSkillXP('persistence', 5);
        } else {
            userStats.currentStreak = 0;
            feedback.className = 'feedback info show';
            feedback.innerHTML = `💡 Дұрыс жауап: ${currentQuestion.a}<br><small>Бұл материалды қайта оқып шығыңыз.</small>`;
            addSkillXP('persistence', 3);
        }
        
        checkAchievements();
        setTimeout(() => {
            loadQuestion();
        }, 3000);
    } else {
        userStats.currentStreak = 0;
        feedback.className = 'feedback error show';
        feedback.innerHTML = `✗ Әлі дұрыс емес. Әрекет қалды: ${3 - userStats.questionAttempts}<br><small>Кеңес алып көріңіз!</small>`;
    }
    
    updateStats();
    saveProgress();
}

function showHint() {
    const hintBox = document.getElementById('hintBox');
    userStats.hintsUsed++;
    userStats.hintCount++;
    
    const hints = [
        `Негізгі түсініктерді еске түсіріңіз: ${currentQuestion.a.split(' ').slice(0, 3).join(' ')}...`,
        `Мысал: ${currentQuestion.a.substring(0, 20)}...`,
        `Ескерту: Бұл тақырыпты оқулықтан қарап алыңыз`
    ];
    
    const hintIndex = Math.min(userStats.hintCount - 1, hints.length - 1);
    
    hintBox.className = 'hint-box show';
    hintBox.innerHTML = `<h4>💡 Кеңес ${userStats.hintCount}:</h4><p>${hints[hintIndex]}</p>`;
    
    updateStats();
    saveProgress();
}

function explainMistake() {
    const hintBox = document.getElementById('hintBox');
    hintBox.className = 'hint-box show';
    hintBox.innerHTML = `
        <h4>📚 Түсініктеме:</h4>
        <p>Бұл тақырыпты жақсырақ түсіну үшін:</p>
        <ul style="margin-left: 1.5rem; margin-top: 0.5rem;">
            <li>Теориялық материалдарды қайта оқыңыз</li>
            <li>Ұқсас мысалдарды қарастырыңыз</li>
            <li>Өз сөзіңізбен түсіндіріп көріңіз</li>
        </ul>
        <p style="margin-top: 1rem;"><strong>Негізгі идея:</strong> ${currentQuestion.a}</p>
    `;
    
    addSkillXP('critical_thinking', 5);
}

function updateStats() {
    document.getElementById('attemptsCount').textContent = userStats.attempts;
    document.getElementById('hintsUsed').textContent = userStats.hintsUsed;
    document.getElementById('correctAnswers').textContent = userStats.correctAnswers;
    
    // Calculate dependency index
    let dependencyPercent = 0;
    if (userStats.attempts > 0) {
        const hintRatio = userStats.hintsUsed / userStats.attempts;
        const successRatio = userStats.correctAnswers / userStats.attempts;
        dependencyPercent = Math.min(100, Math.round((hintRatio * 70 + (1 - successRatio) * 30) * 100));
    }
    
    userStats.currentDependency = dependencyPercent;
    
    const fill = document.getElementById('dependencyFill');
    const percentSpan = document.getElementById('dependencyPercent');
    const message = document.getElementById('dependencyMessage');
    
    fill.style.width = dependencyPercent + '%';
    fill.textContent = dependencyPercent + '%';
    percentSpan.textContent = dependencyPercent + '%';
    
    // Update color
    fill.className = 'meter-fill';
    if (dependencyPercent < 30) {
        fill.classList.add('low');
        message.textContent = '🎉 Өте жақсы! Сіз AI-ға аз тәуелдісіз. Өз бетіңізбен жақсы жұмыс істеп жатырсыз!';
    } else if (dependencyPercent < 60) {
        fill.classList.add('medium');
        message.textContent = '⚠ Орташа деңгей. Кеңестерді азырақ қолданыңыз, өз бетіңізбен көбірек ойланыңыз.';
    } else {
        fill.classList.add('high');
        message.textContent = '❌ Жоғары тәуелділік! AI-ға шамадан тыс сенеді көрінесіз. Өз ойлау дағдыларыңызды дамытыңыз!';
    }
}

// Critical Thinking Functions
function selectCriticalMode(mode) {
    currentCriticalMode = mode;
    document.querySelectorAll('.mode-card').forEach(card => {
        card.classList.remove('active');
    });
    event.target.closest('.mode-card').classList.add('active');
}

function loadCriticalQuestion() {
    const subject = document.getElementById('criticalSubject').value;
    
    if (!subject || !criticalThinkingDB[subject]) {
        document.getElementById('criticalContainer').classList.add('hidden');
        return;
    }
    
    const questions = criticalThinkingDB[subject];
    const randomIndex = Math.floor(Math.random() * questions.length);
    currentCriticalQuestion = questions[randomIndex];
    
    document.getElementById('criticalQuestion').textContent = currentCriticalQuestion.question;
    document.getElementById('aiAnswer').textContent = currentCriticalQuestion.aiAnswer;
    document.getElementById('criticalAnalysis').value = '';
    document.getElementById('criticalFeedback').className = 'feedback';
    
    // Display errors as checkboxes
    const errorsList = document.getElementById('errorsList');
    errorsList.innerHTML = '';
    
    currentCriticalQuestion.errors.forEach((error, index) => {
        const errorItem = document.createElement('div');
        errorItem.className = 'error-item';
        errorItem.innerHTML = `
            <label style="display: flex; align-items: center; cursor: pointer;">
                <input type="checkbox" id="error_${index}" style="margin-right: 0.75rem; cursor: pointer;">
                <span>${error.text}</span>
            </label>
        `;
        errorsList.appendChild(errorItem);
    });
    
    document.getElementById('criticalContainer').classList.remove('hidden');
}

function checkCriticalThinking() {
    const feedback = document.getElementById('criticalFeedback');
    const analysis = document.getElementById('criticalAnalysis').value.trim();
    
    if (!analysis) {
        feedback.className = 'feedback error show';
        feedback.textContent = '⚠ Талдауды жазыңыз!';
        return;
    }
    
    let correctCount = 0;
    let totalErrors = currentCriticalQuestion.errors.length;
    
    currentCriticalQuestion.errors.forEach((error, index) => {
        const checkbox = document.getElementById(`error_${index}`);
        const errorItem = checkbox.closest('.error-item');
        
        if (checkbox.checked === !error.correct) {
            correctCount++;
            errorItem.classList.add('found');
            userStats.errorsFound++;
        }
    });
    
    const score = (correctCount / totalErrors) * 100;
    
    if (score === 100) {
        userStats.perfectCriticalAnalysis++;
        feedback.className = 'feedback success show';
        feedback.innerHTML = `
            <strong>🎉 Өте жақсы!</strong><br>
            Барлық қателерді дұрыс анықтадыңыз!<br>
            <small>Сіздің сыни ойлау дағдыңыз жоғары деңгейде.</small>
        `;
        addSkillXP('critical_thinking', 30);
        addSkillXP('independence', 15);
    } else if (score >= 60) {
        feedback.className = 'feedback info show';
        feedback.innerHTML = `
            <strong>👍 Жақсы!</strong><br>
            ${correctCount}/${totalErrors} қатені таптыңыз (${Math.round(score)}%)<br>
            <small>Жақсы нәтиже, бірақ тағы жақсартуға болады.</small>
        `;
        addSkillXP('critical_thinking', 15);
    } else {
        feedback.className = 'feedback error show';
        feedback.innerHTML = `
            <strong>🤔 Жеткіліксіз</strong><br>
            ${correctCount}/${totalErrors} қатені таптыңыз (${Math.round(score)}%)<br>
            <small>AI жауаптарын мұқият талдауды үйреніңіз.</small>
        `;
        addSkillXP('critical_thinking', 5);
    }
    
    // Show explanations
    setTimeout(() => {
        let explanations = '<div style="margin-top: 1.5rem;"><h4>📖 Түсініктемелер:</h4>';
        currentCriticalQuestion.errors.forEach((error, index) => {
            explanations += `
                <div class="error-marker" style="margin: 0.75rem 0;">
                    <strong>${error.text}</strong><br>
                    <small>${error.explanation}</small>
                </div>
            `;
        });
        explanations += '</div>';
        
        if (currentCriticalQuestion.hint) {
            explanations += `<p style="margin-top: 1rem;"><strong>💡 Кеңес:</strong> ${currentCriticalQuestion.hint}</p>`;
        }
        
        feedback.innerHTML += explanations;
    }, 1500);
    
    checkAchievements();
    saveProgress();
}

function showCriticalHint() {
    const feedback = document.getElementById('criticalFeedback');
    feedback.className = 'feedback info show';
    feedback.innerHTML = `
        <strong>💡 Кеңес:</strong><br>
        ${currentCriticalQuestion.hint}<br>
        <small>AI жауабындағы әрбір тұжырымды мұқият тексеріңіз.</small>
    `;
    
    addSkillXP('critical_thinking', 3);
}

// Achievements System
function checkAchievements() {
    achievements.forEach(achievement => {
        if (!achievement.unlocked && achievement.condition(userStats)) {
            unlockAchievement(achievement);
        } else if (!achievement.unlocked) {
            // Update progress
            updateAchievementProgress(achievement);
        }
    });
    
    updateAchievementsDisplay();
}

function unlockAchievement(achievement) {
    achievement.unlocked = true;
    achievement.progress = achievement.maxProgress;
    
    showAchievementToast(achievement);
    addSkillXP('persistence', 25);
    
    saveProgress();
}

function updateAchievementProgress(achievement) {
    switch (achievement.id) {
        case 'first_try':
            achievement.progress = Math.min(userStats.attempts, 1);
            break;
        case 'independent':
            achievement.progress = Math.min(userStats.solvedWithoutHints, 5);
            break;
        case 'perfectionist':
            achievement.progress = Math.min(userStats.firstTryCorrect, 10);
            break;
        case 'critical_thinker':
            achievement.progress = Math.min(userStats.errorsFound, 10);
            break;
        case 'ai_skeptic':
            achievement.progress = Math.min(userStats.perfectCriticalAnalysis, 5);
            break;
        case 'learner':
            achievement.progress = Math.min(userStats.correctAnswers, 50);
            break;
        case 'streak_5':
            achievement.progress = Math.min(userStats.currentStreak, 5);
            break;
        case 'streak_10':
            achievement.progress = Math.min(userStats.currentStreak, 10);
            break;
        case 'polymath':
            achievement.progress = Math.min(userStats.subjectsCompleted, 5);
            break;
        case 'master':
            const qualified = userStats.correctAnswers >= 30 && (userStats.correctAnswers / userStats.attempts) >= 0.9;
            achievement.progress = qualified ? 30 : Math.min(userStats.correctAnswers, 30);
            break;
        case 'helper_avoider':
            achievement.progress = Math.min(userStats.solvedWithoutHints, 20);
            break;
    }
}

function showAchievementToast(achievement) {
    const toast = document.getElementById('achievementToast');
    const title = document.getElementById('toastTitle');
    const message = document.getElementById('toastMessage');
    
    title.textContent = achievement.title;
    message.textContent = achievement.description;
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 5000);
}

function updateAchievementsDisplay() {
    const grid = document.getElementById('achievementsGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    achievements.forEach(achievement => {
        const progressPercent = (achievement.progress / achievement.maxProgress) * 100;
        
        const card = document.createElement('div');
        card.className = `achievement ${achievement.unlocked ? 'unlocked' : ''}`;
        card.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-title">${achievement.title}</div>
            <div class="achievement-desc">${achievement.description}</div>
            ${!achievement.unlocked ? `
                <div class="achievement-progress">
                    <div class="achievement-progress-bar" style="width: ${progressPercent}%"></div>
                </div>
                <small style="color: var(--text-secondary); margin-top: 0.5rem; display: block;">
                    ${achievement.progress} / ${achievement.maxProgress}
                </small>
            ` : '<div style="margin-top: 0.5rem; color: var(--success); font-weight: 600;">✓ Ашылды</div>'}
        `;
        
        grid.appendChild(card);
    });
}

// Skills System
function addSkillXP(skillId, amount) {
    const skill = skills.find(s => s.id === skillId);
    if (!skill) return;
    
    skill.xp += amount;
    
    while (skill.xp >= skill.maxXP) {
        skill.xp -= skill.maxXP;
        skill.level++;
        skill.maxXP = Math.floor(skill.maxXP * 1.5); // Increase XP requirement
        
        showSkillLevelUp(skill);
    }
    
    updateSkillsDisplay();
    saveProgress();
}

function showSkillLevelUp(skill) {
    const toast = document.getElementById('achievementToast');
    const title = document.getElementById('toastTitle');
    const message = document.getElementById('toastMessage');
    
    title.textContent = `${skill.icon} Деңгей ${skill.level}!`;
    message.textContent = `${skill.name} дағдысы жаңа деңгейге көтерілді!`;
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

function updateSkillsDisplay() {
    const list = document.getElementById('skillsList');
    if (!list) return;
    
    list.innerHTML = '';
    
    skills.forEach(skill => {
        const progressPercent = (skill.xp / skill.maxXP) * 100;
        
        const item = document.createElement('div');
        item.className = 'skill-item';
        item.innerHTML = `
            <div class="skill-header">
                <div class="skill-name">${skill.icon} ${skill.name}</div>
                <div class="skill-level">Деңгей ${skill.level}</div>
            </div>
            <div class="skill-bar">
                <div class="skill-bar-fill" style="width: ${progressPercent}%"></div>
            </div>
            <div class="skill-stats">
                <span>${skill.xp} / ${skill.maxXP} XP</span>
                <span>${skill.description}</span>
            </div>
        `;
        
        list.appendChild(item);
    });
}

function updateProgressStats() {
    const totalQuestions = document.getElementById('totalQuestions');
    const successRate = document.getElementById('successRate');
    const independenceScore = document.getElementById('independenceScore');
    const currentStreak = document.getElementById('currentStreak');
    
    if (totalQuestions) totalQuestions.textContent = userStats.correctAnswers;
    
    if (successRate) {
        const rate = userStats.attempts > 0 
            ? Math.round((userStats.correctAnswers / userStats.attempts) * 100) 
            : 0;
        successRate.textContent = rate + '%';
    }
    
    if (independenceScore) {
        const score = 100 - userStats.currentDependency;
        independenceScore.textContent = score;
    }
    
    if (currentStreak) {
        currentStreak.textContent = userStats.currentStreak;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadProgress();
    updateStats();
    updateAchievementsDisplay();
    updateSkillsDisplay();
});

// Initialize
updateStats();
