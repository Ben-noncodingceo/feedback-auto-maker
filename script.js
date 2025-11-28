// ============================================
// 全局状态
// ============================================
let studentData = {
    name: '',
    subject: '',
    stage: '',
    description: ''
};

// 文件数据存储
let syllabusData = {
    fileName: '',
    content: '',
    chapters: [] // 解析后的章节信息
};

let bannedWordsData = {
    fileName: '',
    words: new Set() // 使用Set存储禁止词，便于快速查找
};

// ============================================
// DOM 元素引用
// ============================================
const elements = {
    // 页面
    inputPage: document.getElementById('inputPage'),
    resultPage: document.getElementById('resultPage'),

    // 文件上传元素
    syllabusFile: document.getElementById('syllabusFile'),
    syllabusFileName: document.getElementById('syllabusFileName'),
    removeSyllabusBtn: document.getElementById('removeSyllabusBtn'),
    syllabusPreview: document.getElementById('syllabusPreview'),
    syllabusContent: document.getElementById('syllabusContent'),

    bannedWordsFile: document.getElementById('bannedWordsFile'),
    bannedWordsFileName: document.getElementById('bannedWordsFileName'),
    removeBannedWordsBtn: document.getElementById('removeBannedWordsBtn'),
    bannedWordsPreview: document.getElementById('bannedWordsPreview'),
    bannedWordsContent: document.getElementById('bannedWordsContent'),
    bannedWordsCount: document.getElementById('bannedWordsCount'),

    // 表单元素
    form: document.getElementById('studentForm'),
    studentName: document.getElementById('studentName'),
    subject: document.getElementById('subject'),
    customSubject: document.getElementById('customSubject'),
    stage: document.getElementById('stage'),
    description: document.getElementById('description'),
    charCount: document.getElementById('charCount'),

    // 结果页面元素
    backBtn: document.getElementById('backBtn'),
    copyBtn: document.getElementById('copyBtn'),
    saveTxtBtn: document.getElementById('saveTxtBtn'),
    saveDocxBtn: document.getElementById('saveDocxBtn'),
    printBtn: document.getElementById('printBtn'),
    planContent: document.getElementById('planContent'),
    evaluationContent: document.getElementById('evaluationContent'),
    resultContent: document.getElementById('resultContent'),

    // 加载和提示
    loadingOverlay: document.getElementById('loadingOverlay'),
    toast: document.getElementById('toast')
};

// ============================================
// 初始化
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
});

function initEventListeners() {
    // 表单提交
    elements.form.addEventListener('submit', handleFormSubmit);

    // 科目选择变化
    elements.subject.addEventListener('change', handleSubjectChange);

    // 字符计数
    elements.description.addEventListener('input', updateCharCount);

    // 文件上传
    elements.syllabusFile.addEventListener('change', handleSyllabusUpload);
    elements.bannedWordsFile.addEventListener('change', handleBannedWordsUpload);
    elements.removeSyllabusBtn.addEventListener('click', removeSyllabus);
    elements.removeBannedWordsBtn.addEventListener('click', removeBannedWords);

    // 结果页面按钮
    elements.backBtn.addEventListener('click', () => switchPage('input'));
    elements.copyBtn.addEventListener('click', copyToClipboard);
    elements.saveTxtBtn.addEventListener('click', saveAsTxt);
    elements.saveDocxBtn.addEventListener('click', saveAsDocx);
    elements.printBtn.addEventListener('click', () => window.print());
}

// ============================================
// 文件上传处理
// ============================================
async function handleSyllabusUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
        showLoading();
        const fileName = file.name;
        const fileExt = fileName.split('.').pop().toLowerCase();

        let content = '';

        if (fileExt === 'txt') {
            content = await readTextFile(file);
        } else if (fileExt === 'docx') {
            content = await readDocxFile(file);
        } else {
            throw new Error('不支持的文件格式');
        }

        // 保存数据
        syllabusData.fileName = fileName;
        syllabusData.content = content;
        syllabusData.chapters = parseSyllabus(content);

        // 更新UI
        elements.syllabusFileName.textContent = fileName;
        elements.removeSyllabusBtn.style.display = 'inline-block';
        elements.syllabusPreview.style.display = 'block';
        elements.syllabusContent.textContent = content.substring(0, 500) + (content.length > 500 ? '...' : '');

        hideLoading();
        showToast(`课程大纲 "${fileName}" 上传成功！`, 'success');
    } catch (error) {
        hideLoading();
        showToast('文件读取失败：' + error.message, 'error');
        e.target.value = '';
    }
}

async function handleBannedWordsUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
        showLoading();
        const fileName = file.name;
        const content = await readTextFile(file);

        // 解析禁止词（按行分割，去除空行和空格）
        const words = content
            .split(/\r?\n/)
            .map(word => word.trim())
            .filter(word => word.length > 0);

        // 保存数据
        bannedWordsData.fileName = fileName;
        bannedWordsData.words = new Set(words);

        // 更新UI
        elements.bannedWordsFileName.textContent = fileName;
        elements.removeBannedWordsBtn.style.display = 'inline-block';
        elements.bannedWordsPreview.style.display = 'block';
        elements.bannedWordsCount.textContent = words.length;
        elements.bannedWordsContent.textContent = words.join(', ');

        hideLoading();
        showToast(`禁止词库 "${fileName}" 上传成功！已加载 ${words.length} 个禁止词`, 'success');
    } catch (error) {
        hideLoading();
        showToast('文件读取失败：' + error.message, 'error');
        e.target.value = '';
    }
}

function removeSyllabus() {
    syllabusData = { fileName: '', content: '', chapters: [] };
    elements.syllabusFile.value = '';
    elements.syllabusFileName.textContent = '未选择文件';
    elements.removeSyllabusBtn.style.display = 'none';
    elements.syllabusPreview.style.display = 'none';
    showToast('已移除课程大纲', 'success');
}

function removeBannedWords() {
    bannedWordsData = { fileName: '', words: new Set() };
    elements.bannedWordsFile.value = '';
    elements.bannedWordsFileName.textContent = '未选择文件';
    elements.removeBannedWordsBtn.style.display = 'none';
    elements.bannedWordsPreview.style.display = 'none';
    showToast('已移除禁止词库', 'success');
}

// ============================================
// 文件读取函数
// ============================================
function readTextFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsText(file, 'UTF-8');
    });
}

async function readDocxFile(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
    } catch (error) {
        throw new Error('DOCX文件解析失败');
    }
}

// ============================================
// 课程大纲解析
// ============================================
function parseSyllabus(content) {
    const chapters = [];
    const lines = content.split(/\r?\n/).filter(line => line.trim());

    // 简单的章节识别逻辑
    // 识别包含"第...章"、"第...节"、"第...单元"、"Chapter"等的行作为章节标题
    const chapterPatterns = [
        /第[一二三四五六七八九十\d]+[章节课单元]/,
        /Chapter\s*\d+/i,
        /Unit\s*\d+/i,
        /^\d+[\.、]\s*.+/,  // 数字开头的标题
    ];

    lines.forEach((line, index) => {
        const trimmedLine = line.trim();

        // 检查是否匹配章节模式
        const isChapter = chapterPatterns.some(pattern => pattern.test(trimmedLine));

        if (isChapter) {
            chapters.push({
                title: trimmedLine,
                order: chapters.length + 1,
                lineNumber: index
            });
        }
    });

    // 如果没有识别到章节，将整个内容按段落分割
    if (chapters.length === 0) {
        const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 10);
        paragraphs.forEach((para, index) => {
            const title = para.split('\n')[0].trim();
            if (title.length < 100) { // 只取较短的行作为标题
                chapters.push({
                    title: title,
                    order: index + 1,
                    lineNumber: index
                });
            }
        });
    }

    return chapters;
}

// ============================================
// 禁止词过滤
// ============================================
function filterBannedWords(text) {
    if (bannedWordsData.words.size === 0) {
        return text; // 没有禁止词，直接返回
    }

    let filteredText = text;

    // 遍历所有禁止词，进行替换
    bannedWordsData.words.forEach(word => {
        const regex = new RegExp(word, 'g');
        filteredText = filteredText.replace(regex, '*'.repeat(word.length));
    });

    return filteredText;
}

// ============================================
// 表单处理
// ============================================
function handleFormSubmit(e) {
    e.preventDefault();

    // 验证表单
    if (!validateForm()) {
        return;
    }

    // 收集数据
    collectFormData();

    // 显示加载动画
    showLoading();

    // 模拟生成过程（1秒后显示结果）
    setTimeout(() => {
        generateResults();
        hideLoading();
        switchPage('result');
        showToast('学习规划生成成功！', 'success');
    }, 1000);
}

function validateForm() {
    const name = elements.studentName.value.trim();
    const subject = elements.subject.value;
    const stage = elements.stage.value;
    const description = elements.description.value.trim();

    // 验证姓名
    if (!name) {
        showToast('请输入学生姓名', 'error');
        elements.studentName.focus();
        return false;
    }

    if (name.length < 1 || name.length > 20) {
        showToast('学生姓名应为1-20个字符', 'error');
        elements.studentName.focus();
        return false;
    }

    // 验证科目
    if (!subject) {
        showToast('请选择学习科目', 'error');
        elements.subject.focus();
        return false;
    }

    if (subject === 'other' && !elements.customSubject.value.trim()) {
        showToast('请输入自定义科目', 'error');
        elements.customSubject.focus();
        return false;
    }

    // 验证阶段
    if (!stage) {
        showToast('请选择学习阶段', 'error');
        elements.stage.focus();
        return false;
    }

    // 验证综合信息
    if (!description) {
        showToast('请输入综合信息', 'error');
        elements.description.focus();
        return false;
    }

    if (description.length < 10) {
        showToast('综合信息至少需要10个字符', 'error');
        elements.description.focus();
        return false;
    }

    if (description.length > 500) {
        showToast('综合信息不能超过500个字符', 'error');
        elements.description.focus();
        return false;
    }

    return true;
}

function collectFormData() {
    studentData.name = elements.studentName.value.trim();
    studentData.subject = elements.subject.value === 'other'
        ? elements.customSubject.value.trim()
        : elements.subject.value;
    studentData.stage = elements.stage.value;
    studentData.description = elements.description.value.trim();
}

function handleSubjectChange() {
    const isCustom = elements.subject.value === 'other';
    elements.customSubject.style.display = isCustom ? 'block' : 'none';
    if (isCustom) {
        elements.customSubject.focus();
    }
}

function updateCharCount() {
    const count = elements.description.value.length;
    elements.charCount.textContent = count;

    if (count > 500) {
        elements.charCount.style.color = '#dc3545';
    } else if (count < 10) {
        elements.charCount.style.color = '#999';
    } else {
        elements.charCount.style.color = '#28a745';
    }
}

// ============================================
// 学习规划生成（增强版 - 使用课程大纲）
// ============================================
function generateResults() {
    const plan = generateLearningPlan();
    const evaluation = generateEvaluation();

    renderPlan(plan);
    renderEvaluation(evaluation);
}

function generateLearningPlan() {
    const { subject, stage, description } = studentData;

    // 生成学习目标
    const goals = generateGoals(subject, stage, description);

    // 生成学习任务（优先使用课程大纲）
    const tasks = generateTasks(subject, stage, description);

    // 生成课时预估
    const timeEstimate = generateTimeEstimate(tasks);

    return { goals, tasks, timeEstimate };
}

function generateGoals(subject, stage, description) {
    // 短期目标（1-2周）
    const shortTerm = generateShortTermGoal(subject, stage, description);

    // 长期目标（1-2个月）
    const longTerm = generateLongTermGoal(subject, stage, description);

    return { shortTerm, longTerm };
}

function generateShortTermGoal(subject, stage, description) {
    const weaknessKeywords = extractWeakness(description);
    const templates = getShortTermTemplates(subject, stage);

    let goal = '';
    if (weaknessKeywords.length > 0) {
        goal = `针对${weaknessKeywords.join('、')}等薄弱环节进行专项训练，${templates.specific}`;
    } else {
        goal = templates.general;
    }

    return filterBannedWords(goal);
}

function generateLongTermGoal(subject, stage, description) {
    const templates = getLongTermTemplates(subject, stage);
    return filterBannedWords(templates.general);
}

function generateTasks(subject, stage, description) {
    const weeks = [];

    // 如果有课程大纲，优先使用大纲内容
    if (syllabusData.chapters.length > 0) {
        weeks.push(...generateTasksFromSyllabus(subject, stage));
    } else {
        // 使用默认模板
        weeks.push(...generateDefaultTasks(subject, stage, description));
    }

    return weeks;
}

function generateTasksFromSyllabus(subject, stage) {
    const weeks = [];
    const chapters = syllabusData.chapters;
    const chaptersPerWeek = Math.max(1, Math.ceil(chapters.length / 4));

    // 将章节分配到4周
    for (let weekNum = 1; weekNum <= 4; weekNum++) {
        const startIdx = (weekNum - 1) * chaptersPerWeek;
        const endIdx = Math.min(startIdx + chaptersPerWeek, chapters.length);
        const weekChapters = chapters.slice(startIdx, endIdx);

        const weekTasks = [];
        const days = ['周一', '周二', '周三', '周四', '周五', '周六'];

        weekChapters.forEach((chapter, idx) => {
            if (idx < days.length) {
                weekTasks.push({
                    day: days[idx],
                    content: filterBannedWords(`学习 ${chapter.title}`),
                    time: '40'
                });
            }
        });

        // 补充练习和复习任务
        if (weekTasks.length < 5) {
            weekTasks.push({
                day: days[weekTasks.length],
                content: filterBannedWords(`本周知识点复习与巩固练习`),
                time: '30'
            });
        }

        if (weekTasks.length < 6) {
            weekTasks.push({
                day: days[weekTasks.length],
                content: filterBannedWords(`周测验与错题整理`),
                time: '35'
            });
        }

        weeks.push({
            week: weekNum,
            tasks: weekTasks
        });
    }

    return weeks;
}

function generateDefaultTasks(subject, stage, description) {
    const taskTemplates = getTaskTemplates(subject, stage);
    const weeks = [];

    // 生成4周的学习任务
    for (let i = 1; i <= 4; i++) {
        const weekTasks = generateWeekTasks(i, taskTemplates, description);
        weeks.push({
            week: i,
            tasks: weekTasks
        });
    }

    return weeks;
}

function generateWeekTasks(weekNumber, templates, description) {
    const tasks = [];
    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

    // 为每周生成5-6个任务（工作日为主）
    const taskDays = weekNumber === 1 ? days.slice(0, 6) : days.slice(0, 5);

    taskDays.forEach((day, index) => {
        const taskType = templates[index % templates.length];
        const content = taskType.content.replace('{week}', weekNumber);

        tasks.push({
            day: day,
            content: filterBannedWords(content),
            time: taskType.time
        });
    });

    return tasks;
}

function generateTimeEstimate(weeks) {
    let totalMinutes = 0;
    const taskTypes = {};

    weeks.forEach(week => {
        week.tasks.forEach(task => {
            totalMinutes += parseInt(task.time);

            const type = getTaskType(task.content);
            taskTypes[type] = (taskTypes[type] || 0) + 1;
        });
    });

    const totalHours = (totalMinutes / 60).toFixed(1);
    const weeklyHours = (totalMinutes / 60 / 4).toFixed(1);

    // 计算任务类型占比
    const totalTasks = weeks.reduce((sum, week) => sum + week.tasks.length, 0);
    const distribution = {};

    for (const [type, count] of Object.entries(taskTypes)) {
        distribution[type] = ((count / totalTasks) * 100).toFixed(0) + '%';
    }

    return {
        totalHours,
        weeklyHours,
        weeklyMinutes: (totalMinutes / 4).toFixed(0),
        distribution
    };
}

function getTaskType(content) {
    if (content.includes('复习') || content.includes('知识点')) return '知识点复习';
    if (content.includes('练习') || content.includes('专项')) return '专项练习';
    if (content.includes('错题') || content.includes('整理')) return '错题整理';
    if (content.includes('测试') || content.includes('测验') || content.includes('模拟')) return '模拟测试';
    if (content.includes('学习') || content.includes('章')) return '新知识学习';
    return '其他';
}

// ============================================
// 评价生成（增强版 - 禁止词过滤）
// ============================================
function generateEvaluation() {
    const { description, subject, stage } = studentData;

    // 优势分析
    const strengths = analyzeStrengths(description, subject);

    // 不足分析
    const weaknesses = analyzeWeaknesses(description, subject);

    // 改进建议
    const improvements = generateImprovements(weaknesses, subject, stage);

    // 鼓励性结语
    const encouragement = generateEncouragement();

    return {
        strengths: strengths.map(s => filterBannedWords(s)),
        weaknesses: weaknesses.map(w => filterBannedWords(w)),
        improvements: improvements.map(i => filterBannedWords(i)),
        encouragement: filterBannedWords(encouragement)
    };
}

function analyzeStrengths(description, subject) {
    const strengthKeywords = {
        '基础': '具备良好的基础知识储备',
        '扎实': '知识掌握较为扎实',
        '理解': '理解能力较强',
        '计算': '计算能力良好',
        '记忆': '记忆力较好',
        '积极': '学习态度积极主动',
        '认真': '学习态度认真',
        '努力': '学习努力刻苦',
        '兴趣': '对学习有浓厚兴趣',
        '快': '学习速度较快',
        '好': '整体学习情况良好'
    };

    const found = [];
    for (const [keyword, strength] of Object.entries(strengthKeywords)) {
        if (description.includes(keyword) && !description.includes('不' + keyword) && !description.includes('缺' + keyword)) {
            found.push(strength);
        }
    }

    if (found.length === 0) {
        found.push(`${subject}学习具有一定基础`, '愿意投入时间进行学习');
    }

    return found;
}

function analyzeWeaknesses(description, subject) {
    const weaknessKeywords = {
        '薄弱': '基础知识掌握不够牢固',
        '不足': '存在知识点欠缺',
        '差': '相关能力有待提升',
        '慢': '学习速度需要提高',
        '粗心': '做题时容易粗心大意',
        '马虎': '学习过程不够细致',
        '丢分': '考试中容易失分',
        '困难': '学习过程中遇到困难',
        '不会': '部分知识点未掌握',
        '理解': '理解能力需要加强',
        '应用': '知识应用能力不足',
        '词汇': '词汇量积累不够',
        '语法': '语法知识掌握不足',
        '阅读': '阅读能力有待提升',
        '写作': '写作水平需要提高'
    };

    const found = [];
    for (const [keyword, weakness] of Object.entries(weaknessKeywords)) {
        if (description.includes(keyword)) {
            found.push(weakness);
            if (found.length >= 3) break; // 最多列举3个
        }
    }

    if (found.length === 0) {
        found.push('部分知识点掌握不够扎实');
    }

    return found;
}

function generateImprovements(weaknesses, subject, stage) {
    const improvements = [];

    // 基于薄弱环节生成建议
    weaknesses.forEach(weakness => {
        if (weakness.includes('基础')) {
            improvements.push('每天坚持复习基础知识点，做好笔记整理，确保基础知识扎实');
        } else if (weakness.includes('词汇')) {
            improvements.push('制定词汇背诵计划，每天背诵15-20个新单词，定期复习');
        } else if (weakness.includes('阅读')) {
            improvements.push('每天坚持15-20分钟阅读训练，提高阅读速度和理解能力');
        } else if (weakness.includes('应用')) {
            improvements.push('加强专项练习，注重知识点的实际应用，多做综合题型');
        } else if (weakness.includes('粗心') || weakness.includes('马虎')) {
            improvements.push('培养细心检查的习惯，做完题目后仔细核对答案');
        } else if (weakness.includes('理解')) {
            improvements.push('遇到难点多思考，多向老师请教，理解知识点背后的原理');
        }
    });

    // 如果有课程大纲，添加相关建议
    if (syllabusData.chapters.length > 0) {
        improvements.push('按照课程大纲的章节顺序系统学习，确保知识体系的完整性');
    }

    // 添加通用建议
    improvements.push('制定科学的学习计划，保证每天的学习时间和质量');
    improvements.push('建立错题本，定期复习错题，避免重复犯错');

    // 基于学习阶段的建议
    if (stage.includes('小学')) {
        improvements.push('培养良好的学习习惯，打好基础很重要');
    } else if (stage.includes('初中')) {
        improvements.push('注重知识体系的构建，学会归纳总结');
    } else if (stage.includes('高中')) {
        improvements.push('加强综合能力训练，提高解决复杂问题的能力');
    }

    return improvements.slice(0, 5); // 最多返回5条建议
}

function generateEncouragement() {
    const encouragements = [
        '只要坚持按计划学习，一定能取得进步！相信自己，加油！',
        '学习是一个循序渐进的过程，保持耐心和恒心，你一定会成功！',
        '每一次努力都不会白费，坚持下去，未来可期！',
        '相信通过努力，你的学习成绩一定会有明显提升！加油！',
        '学习没有捷径，但只要踏实前行，就一定能到达目标！'
    ];

    return encouragements[Math.floor(Math.random() * encouragements.length)];
}

// ============================================
// 辅助函数（模板获取）
// ============================================
function extractWeakness(description) {
    const keywords = [];
    const patterns = [
        { regex: /(\S+)薄弱/, name: '{0}' },
        { regex: /(\S+)不足/, name: '{0}' },
        { regex: /(\S+)丢分/, name: '{0}问题' },
        { regex: /(\S+)困难/, name: '{0}' }
    ];

    patterns.forEach(pattern => {
        const match = description.match(pattern.regex);
        if (match) {
            keywords.push(match[1]);
        }
    });

    return keywords;
}

function getShortTermTemplates(subject, stage) {
    const templates = {
        '数学': {
            specific: '提高解题准确率和速度',
            general: '掌握本阶段核心知识点，提升计算和应用能力'
        },
        '语文': {
            specific: '提升阅读理解和写作水平',
            general: '提高阅读理解能力，积累写作素材'
        },
        '英语': {
            specific: '扩充词汇量，提升语言运用能力',
            general: '提升词汇量和语法掌握水平'
        },
        '物理': {
            specific: '理解物理概念，提高解题能力',
            general: '掌握物理基本概念和公式应用'
        },
        '化学': {
            specific: '强化化学反应理解，提升实验分析能力',
            general: '掌握化学基础知识和实验技能'
        }
    };

    return templates[subject] || {
        specific: '针对薄弱环节进行强化训练',
        general: '巩固基础知识，提升综合能力'
    };
}

function getLongTermTemplates(subject, stage) {
    const templates = {
        '数学': {
            general: '建立完整的数学知识体系，能够独立解决综合性问题，数学成绩提升一个档次'
        },
        '语文': {
            general: '阅读理解准确率提升20%以上，写作水平明显进步，能够写出结构完整、内容充实的文章'
        },
        '英语': {
            general: '词汇量提升500-800词，能够流畅阅读中等难度文章，写作能力显著提高'
        },
        '物理': {
            general: '深入理解物理原理，能够灵活运用知识解决实际问题，成绩稳步提升'
        },
        '化学': {
            general: '掌握化学核心概念，能够独立完成实验分析，化学思维能力显著提升'
        }
    };

    return templates[subject] || {
        general: `${subject}综合能力显著提升，成绩稳定在良好以上水平`
    };
}

function getTaskTemplates(subject, stage) {
    const baseTemplates = {
        '数学': [
            { content: '复习第{week}周核心知识点，完成课本例题', time: '30' },
            { content: '专项练习：计算题强化训练', time: '25' },
            { content: '应用题专项突破练习', time: '30' },
            { content: '错题整理与分析', time: '20' },
            { content: '周测模拟练习', time: '40' },
            { content: '知识点复习与总结', time: '25' }
        ],
        '语文': [
            { content: '课文精读与重点字词积累', time: '25' },
            { content: '阅读理解专项训练', time: '30' },
            { content: '写作素材积累与练习', time: '30' },
            { content: '古诗文背诵与默写', time: '20' },
            { content: '作文专项训练', time: '40' },
            { content: '字词复习与听写', time: '20' }
        ],
        '英语': [
            { content: '词汇背诵与默写（15-20个单词）', time: '20' },
            { content: '语法知识点学习与练习', time: '25' },
            { content: '阅读理解专项训练', time: '30' },
            { content: '听力练习', time: '20' },
            { content: '写作训练', time: '30' },
            { content: '单元复习与测试', time: '35' }
        ],
        '物理': [
            { content: '物理概念理解与公式记忆', time: '25' },
            { content: '基础题型练习', time: '30' },
            { content: '实验原理学习与分析', time: '25' },
            { content: '综合题型训练', time: '35' },
            { content: '错题分析与订正', time: '20' },
            { content: '单元知识总结', time: '25' }
        ],
        '化学': [
            { content: '化学方程式记忆与理解', time: '25' },
            { content: '实验现象分析练习', time: '30' },
            { content: '化学计算专项训练', time: '30' },
            { content: '基础知识点复习', time: '25' },
            { content: '综合题型练习', time: '35' },
            { content: '错题整理', time: '20' }
        ]
    };

    // 如果科目不在模板中，使用通用模板
    if (!baseTemplates[subject]) {
        return [
            { content: '基础知识点复习', time: '25' },
            { content: '专项练习', time: '30' },
            { content: '综合题型训练', time: '30' },
            { content: '错题整理与分析', time: '20' },
            { content: '模拟测试', time: '40' },
            { content: '知识总结', time: '25' }
        ];
    }

    return baseTemplates[subject];
}

// ============================================
// 渲染函数
// ============================================
function renderPlan(plan) {
    const { goals, tasks, timeEstimate } = plan;

    let html = `
        <div class="plan-section">
            <h3>学习目标</h3>
            <div class="evaluation-item">
                <h4>短期目标（1-2周）</h4>
                <p>${goals.shortTerm}</p>
            </div>
            <div class="evaluation-item">
                <h4>长期目标（1-2个月）</h4>
                <p>${goals.longTerm}</p>
            </div>
        </div>

        <div class="plan-section">
            <h3>学习任务安排</h3>
            ${syllabusData.chapters.length > 0 ?
                '<p style="color: #28a745; margin-bottom: 10px;"><strong>✓ 已根据上传的课程大纲生成学习任务</strong></p>' :
                ''}
    `;

    // 渲染每周任务
    tasks.forEach(week => {
        html += `
            <div class="week-tasks" onclick="toggleWeek(this)">
                <div class="week-header">
                    <h4>第 ${week.week} 周学习计划</h4>
                    <span class="toggle-icon">▼</span>
                </div>
                <div class="week-content">
                    <ul>
        `;

        week.tasks.forEach(task => {
            html += `
                <li class="task-item">
                    <strong>${task.day}：</strong>${task.content}
                    <span class="time-estimate">${task.time}分钟</span>
                </li>
            `;
        });

        html += `
                    </ul>
                </div>
            </div>
        `;
    });

    html += `
        </div>

        <div class="plan-section">
            <h3>课时预估汇总</h3>
            <div class="summary-box">
                <div class="summary-item">
                    <span class="summary-label">每周建议学习时长：</span>
                    <span class="summary-value">${timeEstimate.weeklyHours} 小时（约${timeEstimate.weeklyMinutes}分钟）</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">四周总计学习时长：</span>
                    <span class="summary-value">${timeEstimate.totalHours} 小时</span>
                </div>
            </div>

            <h4 style="margin-top: 15px;">任务类型分布</h4>
            <ul style="margin-top: 10px;">
    `;

    for (const [type, percent] of Object.entries(timeEstimate.distribution)) {
        html += `<li>${type}：${percent}</li>`;
    }

    html += `
            </ul>
        </div>
    `;

    elements.planContent.innerHTML = html;
}

function renderEvaluation(evaluation) {
    const { strengths, weaknesses, improvements, encouragement } = evaluation;

    let html = `
        <div class="evaluation-item">
            <h4>✨ 优势分析</h4>
            <ul>
                ${strengths.map(s => `<li>${s}</li>`).join('')}
            </ul>
        </div>

        <div class="evaluation-item">
            <h4>📌 不足分析</h4>
            <ul>
                ${weaknesses.map(w => `<li>${w}</li>`).join('')}
            </ul>
        </div>

        <div class="evaluation-item">
            <h4>💡 改进建议</h4>
            <ul>
                ${improvements.map(i => `<li>${i}</li>`).join('')}
            </ul>
        </div>

        <div class="evaluation-item" style="background: #e3f2fd; border-left-color: #28a745;">
            <h4>🌟 鼓励寄语</h4>
            <p><strong>${encouragement}</strong></p>
        </div>
    `;

    if (bannedWordsData.words.size > 0) {
        html += `
            <div style="margin-top: 15px; padding: 10px; background: #fff3cd; border-radius: 4px; font-size: 13px;">
                <strong>提示：</strong>生成的内容已根据禁止词库过滤（共${bannedWordsData.words.size}个禁止词）
            </div>
        `;
    }

    elements.evaluationContent.innerHTML = html;
}

// ============================================
// 导出功能
// ============================================
function copyToClipboard() {
    const text = generateExportText();

    // 使用 Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
            .then(() => {
                showToast('内容已复制到剪贴板！', 'success');
            })
            .catch(() => {
                fallbackCopy(text);
            });
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    try {
        document.execCommand('copy');
        showToast('内容已复制到剪贴板！', 'success');
    } catch (err) {
        showToast('复制失败，请手动复制', 'error');
    }

    document.body.removeChild(textarea);
}

function saveAsTxt() {
    const text = generateExportText();
    const date = new Date().toISOString().split('T')[0];
    const filename = `${studentData.name}-学习规划-${date}.txt`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
    showToast('TXT文件已开始下载！', 'success');
}

async function saveAsDocx() {
    try {
        showLoading();

        const date = new Date().toLocaleDateString('zh-CN');
        const filename = `${studentData.name}-学习规划-${new Date().toISOString().split('T')[0]}.docx`;

        // 使用docx库创建文档
        const doc = new docx.Document({
            sections: [{
                properties: {},
                children: [
                    // 标题
                    new docx.Paragraph({
                        text: "学生学习规划与评价报告",
                        heading: docx.HeadingLevel.HEADING_1,
                        alignment: docx.AlignmentType.CENTER,
                        spacing: { after: 200 }
                    }),

                    // 基本信息
                    new docx.Paragraph({
                        text: `学生姓名：${studentData.name}`,
                        spacing: { after: 100 }
                    }),
                    new docx.Paragraph({
                        text: `学习科目：${studentData.subject}`,
                        spacing: { after: 100 }
                    }),
                    new docx.Paragraph({
                        text: `学习阶段：${studentData.stage}`,
                        spacing: { after: 100 }
                    }),
                    new docx.Paragraph({
                        text: `生成日期：${date}`,
                        spacing: { after: 300 }
                    }),

                    // 学习情况描述
                    new docx.Paragraph({
                        text: "学习情况描述",
                        heading: docx.HeadingLevel.HEADING_2,
                        spacing: { before: 200, after: 100 }
                    }),
                    new docx.Paragraph({
                        text: studentData.description,
                        spacing: { after: 300 }
                    }),

                    // 学习规划
                    new docx.Paragraph({
                        text: "📚 学习规划",
                        heading: docx.HeadingLevel.HEADING_2,
                        spacing: { before: 200, after: 100 }
                    }),
                    new docx.Paragraph({
                        text: elements.planContent.innerText,
                        spacing: { after: 300 }
                    }),

                    // 综合评价
                    new docx.Paragraph({
                        text: "📝 综合评价",
                        heading: docx.HeadingLevel.HEADING_2,
                        spacing: { before: 200, after: 100 }
                    }),
                    new docx.Paragraph({
                        text: elements.evaluationContent.innerText,
                        spacing: { after: 200 }
                    }),

                    // 页脚
                    new docx.Paragraph({
                        text: "© 2024 学生学习规划生成器",
                        alignment: docx.AlignmentType.CENTER,
                        spacing: { before: 400 }
                    })
                ]
            }]
        });

        // 生成并下载
        const blob = await docx.Packer.toBlob(doc);
        saveAs(blob, filename);

        hideLoading();
        showToast('DOCX文件已开始下载！', 'success');
    } catch (error) {
        hideLoading();
        showToast('DOCX生成失败：' + error.message, 'error');
        console.error(error);
    }
}

function generateExportText() {
    const date = new Date().toLocaleDateString('zh-CN');
    const planText = elements.planContent.innerText;
    const evaluationText = elements.evaluationContent.innerText;

    let fileInfo = '';
    if (syllabusData.fileName) {
        fileInfo += `\n课程大纲：${syllabusData.fileName}`;
    }
    if (bannedWordsData.fileName) {
        fileInfo += `\n禁止词库：${bannedWordsData.fileName}（${bannedWordsData.words.size}个禁止词）`;
    }

    return `
====================================
学生学习规划与评价报告
====================================

学生姓名：${studentData.name}
学习科目：${studentData.subject}
学习阶段：${studentData.stage}
生成日期：${date}${fileInfo}

------------------------------------
学习情况描述
------------------------------------
${studentData.description}

------------------------------------
📚 学习规划
------------------------------------
${planText}

------------------------------------
📝 综合评价
------------------------------------
${evaluationText}

====================================
© 2024 学生学习规划生成器
本规划由系统自动生成，建议结合实际情况调整
====================================
    `.trim();
}

// ============================================
// UI 交互
// ============================================
function switchPage(page) {
    if (page === 'input') {
        elements.inputPage.classList.add('active');
        elements.resultPage.classList.remove('active');
    } else {
        elements.inputPage.classList.remove('active');
        elements.resultPage.classList.add('active');
        window.scrollTo(0, 0);
    }
}

function showLoading() {
    elements.loadingOverlay.classList.add('active');
}

function hideLoading() {
    elements.loadingOverlay.classList.remove('active');
}

function showToast(message, type = 'success') {
    elements.toast.textContent = message;
    elements.toast.className = `toast ${type} show`;

    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
}

function toggleWeek(element) {
    element.classList.toggle('collapsed');
}

function togglePreview(contentId) {
    const content = document.getElementById(contentId);
    if (content) {
        content.classList.toggle('collapsed');
    }
}

// ============================================
// 全局函数（供 HTML onclick 调用）
// ============================================
window.toggleWeek = toggleWeek;
window.togglePreview = togglePreview;
