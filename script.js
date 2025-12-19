// 测试样例数据模型
let testCases = [];
let nextId = 1;
let currentTestCaseId = null;

// DOM元素
const testcasesList = document.getElementById('testcases-list');
const noSelection = document.getElementById('no-selection');
const editorContent = document.getElementById('editor-content');
const editorTitle = document.querySelector('#editor-title span');
const inputEditor = document.getElementById('input-editor');
const outputEditor = document.getElementById('output-editor');
const inputCount = document.getElementById('input-count');
const outputCount = document.getElementById('output-count');
const addButton = document.getElementById('add-testcase');
const batchAddButton = document.getElementById('batch-add');
const downloadButton = document.getElementById('download-all');
const notification = document.getElementById('notification');

// 模态框元素
const batchModal = document.getElementById('batch-modal');
const batchInput = document.getElementById('batch-input');
const batchSubmit = document.getElementById('batch-submit');
const batchCancel = document.getElementById('batch-cancel');
const closeModalButtons = document.querySelectorAll('.close-modal');

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 从本地存储加载数据
    loadFromLocalStorage();
    
    // 绑定事件监听器
    addButton.addEventListener('click', addTestCase);
    batchAddButton.addEventListener('click', openBatchModal);
    downloadButton.addEventListener('click', downloadAllTestCases);
    
    // 批量添加事件
    batchSubmit.addEventListener('click', processBatchInput);
    batchCancel.addEventListener('click', closeBatchModal);
    closeModalButtons.forEach(btn => btn.addEventListener('click', closeBatchModal));
    
    // 点击模态框外部关闭
    batchModal.addEventListener('click', function(e) {
        if (e.target === batchModal) {
            closeBatchModal();
        }
    });
    
    // 输入编辑器事件监听
    inputEditor.addEventListener('input', function() {
        updateCount(inputCount, this.value);
        updateTestCaseContent('input', this.value);
    });
    
    outputEditor.addEventListener('input', function() {
        updateCount(outputCount, this.value);
        updateTestCaseContent('output', this.value);
    });
    
    // 标签切换
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabType = this.getAttribute('data-tab');
            switchTab(tabType);
        });
    });
    
    // 渲染初始列表
    renderTestCasesList();
});

// 添加新的测试样例
function addTestCase() {
    const newTestCase = {
        id: nextId++,
        input: '',
        output: ''
    };
    
    testCases.push(newTestCase);
    saveToLocalStorage();
    renderTestCasesList();
    selectTestCase(newTestCase.id);
    
    showNotification('新测试样例已创建');
}

// 批量添加测试样例
function openBatchModal() {
    batchInput.value = '';
    batchModal.classList.add('active');
}

function closeBatchModal() {
    batchModal.classList.remove('active');
}

function processBatchInput() {
    const text = batchInput.value.trim();
    if (!text) {
        showNotification('请输入批量数据', true);
        return;
    }
    
    const testCasesFromBatch = parseBatchInput(text);
    if (testCasesFromBatch.length === 0) {
        showNotification('未找到有效的测试样例数据', true);
        return;
    }
    
    // 添加解析出的测试样例
    testCasesFromBatch.forEach(testCase => {
        testCase.id = nextId++;
        testCases.push(testCase);
    });
    
    saveToLocalStorage();
    renderTestCasesList();
    closeBatchModal();
    
    showNotification(`成功添加 ${testCasesFromBatch.length} 个测试样例`);
}

// 解析批量输入
function parseBatchInput(text) {
    const testCases = [];
    let currentIn = null;
    let currentOut = null;
    let currentInputLines = [];
    let currentOutputLines = [];
    let parsingInput = false;
    let parsingOutput = false;
    
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // 检查是否是输入标记
        const inMatch = line.match(/^in(\d+):$/i);
        if (inMatch) {
            // 如果之前有正在解析的样例，保存它
            if (currentIn !== null && currentOut !== null) {
                testCases.push({
                    input: currentInputLines.join('\n'),
                    output: currentOutputLines.join('\n')
                });
                currentInputLines = [];
                currentOutputLines = [];
            }
            
            currentIn = parseInt(inMatch[1]);
            currentOut = null;
            parsingInput = true;
            parsingOutput = false;
            continue;
        }
        
        // 检查是否是输出标记
        const outMatch = line.match(/^out(\d+):$/i);
        if (outMatch) {
            if (currentIn === null) {
                continue; // 没有输入，忽略输出
            }
            
            currentOut = parseInt(outMatch[1]);
            parsingInput = false;
            parsingOutput = true;
            continue;
        }
        
        // 如果是输入数据行
        if (parsingInput) {
            currentInputLines.push(line);
        }
        
        // 如果是输出数据行
        if (parsingOutput) {
            currentOutputLines.push(line);
        }
    }
    
    // 添加最后一个样例
    if (currentIn !== null && currentOut !== null && 
        (currentInputLines.length > 0 || currentOutputLines.length > 0)) {
        testCases.push({
            input: currentInputLines.join('\n'),
            output: currentOutputLines.join('\n')
        });
    }
    
    return testCases;
}

// 删除测试样例
function deleteTestCase(id) {
    if (!confirm('确定要删除这个测试样例吗？')) return;
    
    // 从数组中移除
    testCases = testCases.filter(testCase => testCase.id !== id);
    
    // 如果删除的是当前选中的样例，则清空选择
    if (currentTestCaseId === id) {
        currentTestCaseId = null;
        noSelection.style.display = 'flex';
        editorContent.classList.remove('active');
    }
    
    // 重新编号
    renumberTestCases();
    saveToLocalStorage();
    renderTestCasesList();
    
    showNotification('测试样例已删除');
}

// 重新编号测试样例
function renumberTestCases() {
    // 按ID排序
    testCases.sort((a, b) => a.id - b.id);
    
    // 更新nextId
    if (testCases.length > 0) {
        nextId = Math.max(...testCases.map(tc => tc.id)) + 1;
    } else {
        nextId = 1;
    }
}

// 选择测试样例
function selectTestCase(id) {
    const testCase = testCases.find(tc => tc.id === id);
    if (!testCase) return;
    
    currentTestCaseId = id;
    
    // 更新UI显示
    noSelection.style.display = 'none';
    editorContent.classList.add('active');
    editorTitle.textContent = `编辑样例 ${testCase.id}`;
    
    // 更新编辑器内容
    inputEditor.value = testCase.input;
    outputEditor.value = testCase.output;
    updateCount(inputCount, testCase.input);
    updateCount(outputCount, testCase.output);
    
    // 更新列表中的活动状态
    document.querySelectorAll('.testcase-item').forEach(item => {
        item.classList.remove('active');
        if (parseInt(item.dataset.id) === id) {
            item.classList.add('active');
        }
    });
    
    // 默认切换到输入标签
    switchTab('input');
}

// 更新测试样例内容
function updateTestCaseContent(type, content) {
    const testCase = testCases.find(tc => tc.id === currentTestCaseId);
    if (!testCase) return;
    
    if (type === 'input') {
        testCase.input = content;
    } else {
        testCase.output = content;
    }
    
    saveToLocalStorage();
}

// 切换标签页
function switchTab(tabType) {
    // 更新标签按钮状态
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-tab') === tabType) {
            tab.classList.add('active');
        }
    });
    
    // 更新标签内容显示
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        if (content.id === `${tabType}-tab`) {
            content.classList.add('active');
        }
    });
}

// 更新字符计数
function updateCount(element, text) {
    const charCount = text.length;
    const lineCount = text.split('\n').length;
    element.textContent = `${lineCount} 行, ${charCount} 字符`;
}

// 渲染测试样例列表
function renderTestCasesList() {
    if (testCases.length === 0) {
        testcasesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <p>暂无测试样例，点击上方按钮添加</p>
            </div>
        `;
        return;
    }
    
    testcasesList.innerHTML = '';
    
    testCases.forEach(testCase => {
        const testcaseElement = document.createElement('div');
        testcaseElement.className = `testcase-item ${currentTestCaseId === testCase.id ? 'active' : ''}`;
        testcaseElement.dataset.id = testCase.id;
        
        // 计算输入输出的行数
        const inputLines = testCase.input.split('\n').length;
        const outputLines = testCase.output.split('\n').length;
        
        testcaseElement.innerHTML = `
            <div>
                <div class="testcase-number">样例 ${testCase.id}</div>
                <div style="font-size: 0.8rem; color: #7f8c8d; margin-top: 5px;">
                    IN: ${inputLines}行, OUT: ${outputLines}行
                </div>
            </div>
            <div class="testcase-actions">
                <button class="icon-btn delete-btn" title="删除">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        // 添加点击事件
        testcaseElement.addEventListener('click', function(e) {
            if (!e.target.closest('.icon-btn')) {
                selectTestCase(testCase.id);
            }
        });
        
        // 添加删除按钮事件
        const deleteBtn = testcaseElement.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            deleteTestCase(testCase.id);
        });
        
        testcasesList.appendChild(testcaseElement);
    });
}

// 下载所有测试样例为ZIP文件
async function downloadAllTestCases() {
    if (testCases.length === 0) {
        showNotification('没有可下载的测试样例', true);
        return;
    }
    
    try {
        const zip = new JSZip();
        
        // 只添加.in和.out文件，不添加额外的文件
        testCases.forEach(testCase => {
            zip.file(`${testCase.id}.in`, testCase.input);
            zip.file(`${testCase.id}.out`, testCase.output);
        });
        
        // 生成ZIP文件
        const content = await zip.generateAsync({type: "blob"});
        
        // 下载文件
        saveAs(content, `testcases_${new Date().getTime()}.zip`);
        
        showNotification(`已打包下载 ${testCases.length} 个测试样例`);
    } catch (error) {
        console.error('生成ZIP文件时出错:', error);
        showNotification('下载失败，请重试', true);
    }
}

// 显示通知
function showNotification(message, isError = false) {
    notification.textContent = message;
    notification.className = 'notification';
    
    if (isError) {
        notification.classList.add('error');
    }
    
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// 本地存储功能
function saveToLocalStorage() {
    const data = {
        testCases: testCases,
        nextId: nextId
    };
    localStorage.setItem('testCasesManager', JSON.stringify(data));
}

function loadFromLocalStorage() {
    const savedData = localStorage.getItem('testCasesManager');
    if (savedData) {
        try {
            const data = JSON.parse(savedData);
            testCases = data.testCases || [];
            nextId = data.nextId || 1;
        } catch (e) {
            console.error('加载本地存储数据失败:', e);
            testCases = [];
            nextId = 1;
        }
    }
}

// 添加示例数据
function addSampleData() {
    if (testCases.length === 0 && localStorage.getItem('firstVisit') === null) {
        // 添加示例测试样例
        testCases = [
            {
                id: 1,
                input: '5\n1 2 3 4 5\n',
                output: '15\n'
            },
            {
                id: 2,
                input: '3\n10 20 30\n',
                output: '60\n'
            }
        ];
        nextId = 3;
        localStorage.setItem('firstVisit', 'false');
        saveToLocalStorage();
        renderTestCasesList();
    }
}

// 初始化示例数据
addSampleData();
