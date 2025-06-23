/**
 * MechDog 파이썬 학습 - 공통 스크립트
 * CodeMirror 에디터와 Pyodide 파이썬 실행 환경 관리
 */

let pyodide = null;
let codeEditor = null;

/**
 * CodeMirror 에디터 초기화
 * @param {string} defaultCode - 에디터에 표시할 기본 코드
 */
function initCodeEditor(defaultCode = '') {
    const container = document.getElementById('code-editor-container');
    
    if (!container) {
        console.error('code-editor-container를 찾을 수 없습니다.');
        return;
    }
    
    // Create textarea element
    const textarea = document.createElement('textarea');
    textarea.id = 'code-textarea';
    textarea.value = defaultCode;
    
    container.appendChild(textarea);
    
    // Initialize CodeMirror
    codeEditor = CodeMirror.fromTextArea(textarea, {
        mode: 'python',
        theme: 'monokai',
        lineNumbers: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        indentUnit: 4,
        smartIndent: true,
        electricChars: true,
        lineWrapping: false,
        foldGutter: true,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
        highlightSelectionMatches: {showToken: /\w/, annotateScrollbar: true},
        styleActiveLine: true,
        viewportMargin: Infinity,
        extraKeys: {
            "Ctrl-Space": "autocomplete",
            "Tab": function(cm) {
                if (cm.somethingSelected()) {
                    cm.indentSelection("add");
                } else {
                    cm.replaceSelection("    ", "end");
                }
            }
        }
    });
    
    // 에디터 크기 조정 (리사이즈 가능)
    codeEditor.setSize(null, "300px");
    
    // 수동 리사이즈 가능하도록 wrapper에 리사이즈 핸들 추가
    const wrapper = codeEditor.getWrapperElement();
    wrapper.style.resize = "vertical";
    wrapper.style.overflow = "hidden hidden";
    wrapper.style.minHeight = "200px";
    wrapper.style.maxHeight = "600px";
    
    // 포커스 시 테두리 효과
    codeEditor.on('focus', function() {
        codeEditor.getWrapperElement().style.borderColor = '#00d9ff';
        codeEditor.getWrapperElement().style.boxShadow = '0 0 20px rgba(0, 217, 255, 0.3)';
    });
    
    codeEditor.on('blur', function() {
        codeEditor.getWrapperElement().style.borderColor = '#404040';
        codeEditor.getWrapperElement().style.boxShadow = 'none';
    });
}

/**
 * 기본 textarea 에디터 초기화 (CodeMirror가 로드되지 않았을 때의 백업)
 * @param {string} defaultCode - 에디터에 표시할 기본 코드
 */
function initBasicEditor(defaultCode = '') {
    const editorElement = document.getElementById('code-editor');
    if (editorElement) {
        editorElement.value = defaultCode;
    }
}

/**
 * Pyodide 초기화
 */
async function initPyodide() {
    if (pyodide === null) {
        const outputElement = document.getElementById('output');
        if (outputElement) {
            outputElement.textContent = '파이썬 엔진을 준비하고 있습니다...';
        }
        
        try {
            pyodide = await loadPyodide();
            if (outputElement) {
                outputElement.textContent = '준비 완료! 코드를 실행해보세요.\n\n💡 VSCode 스타일 에디터의 문법 강조 기능을 확인해보세요:\n• 함수명: 파란색\n• 문자열: 초록색\n• 주석: 회색\n• 숫자: 보라색';
            }
        } catch (error) {
            console.error('Pyodide 초기화 실패:', error);
            if (outputElement) {
                outputElement.textContent = '파이썬 엔진 초기화에 실패했습니다. 페이지를 새로고침해주세요.';
            }
        }
    }
}

/**
 * 파이썬 코드 실행
 * @param {string} code - 실행할 파이썬 코드
 */
async function runPythonCode(code) {
    if (pyodide === null) {
        await initPyodide();
    }
    
    const outputElement = document.getElementById('output');
    if (!outputElement) {
        console.error('output 요소를 찾을 수 없습니다.');
        return;
    }
    
    try {
        // 실행 중 표시
        outputElement.innerHTML = '<div class="loading-spinner"></div> 코드를 실행하고 있습니다...';
        
        // Capture stdout
        pyodide.runPython(`
            import sys
            from io import StringIO
            old_stdout = sys.stdout
            sys.stdout = captured_output = StringIO()
        `);
        
        // Run user code
        pyodide.runPython(code);
        
        // Get output
        const output = pyodide.runPython(`
            sys.stdout = old_stdout
            captured_output.getvalue()
        `);
        
        outputElement.textContent = output || '(출력 없음)';
        
        // Update progress
        updateProgress();
        
    } catch (error) {
        outputElement.textContent = `오류 발생:\n${error.message}`;
    }
}

/**
 * 학습 진도 업데이트
 */
function updateProgress() {
    try {
        let progress = JSON.parse(localStorage.getItem('mechDogLearningProgress') || '{"lessonsCompleted": 0, "codesRun": 0}');
        progress.codesRun = (progress.codesRun || 0) + 1;
        
        // 현재 페이지의 레슨 번호 추출
        const currentLesson = getCurrentLessonNumber();
        if (currentLesson && progress.lessonsCompleted < currentLesson) {
            progress.lessonsCompleted = currentLesson;
        }
        
        localStorage.setItem('mechDogLearningProgress', JSON.stringify(progress));
    } catch (error) {
        console.error('진도 업데이트 실패:', error);
    }
}

/**
 * 현재 레슨 번호 추출
 * @returns {number|null} 레슨 번호 또는 null
 */
function getCurrentLessonNumber() {
    const pathname = window.location.pathname;
    const match = pathname.match(/lesson(\d+)\.html/);
    return match ? parseInt(match[1]) : null;
}

/**
 * 퀴즈 답변 처리
 * @param {string} quizId - 퀴즈 ID
 * @param {HTMLElement} selectedOption - 선택된 옵션 요소
 * @param {boolean} isCorrect - 정답 여부
 */
function handleQuizAnswer(quizId, selectedOption, isCorrect) {
    const options = document.querySelectorAll(`[data-quiz="${quizId}"]`);
    const resultDiv = document.getElementById(`quiz-${quizId}-result`);
    
    options.forEach(option => {
        option.style.pointerEvents = 'none';
        if (option === selectedOption) {
            option.classList.add(isCorrect ? 'correct' : 'incorrect');
        } else if (option.dataset.answer === 'correct') {
            option.classList.add('correct');
        }
    });
    
    if (resultDiv) {
        if (isCorrect) {
            resultDiv.textContent = '정답입니다! 🎉';
            resultDiv.className = 'mt-4 text-sm font-medium text-green-600';
        } else {
            resultDiv.textContent = '틀렸습니다. 다시 생각해보세요! 🤔';
            resultDiv.className = 'mt-4 text-sm font-medium text-red-600';
        }
        resultDiv.classList.remove('hidden');
    }
}

/**
 * 코드 에디터 값 가져오기
 * @returns {string} 에디터의 현재 코드
 */
function getEditorValue() {
    if (codeEditor) {
        return codeEditor.getValue();
    } else {
        const basicEditor = document.getElementById('code-editor');
        return basicEditor ? basicEditor.value : '';
    }
}

/**
 * 코드 에디터 값 설정
 * @param {string} code - 설정할 코드
 */
function setEditorValue(code) {
    if (codeEditor) {
        codeEditor.setValue(code);
    } else {
        const basicEditor = document.getElementById('code-editor');
        if (basicEditor) {
            basicEditor.value = code;
        }
    }
}

/**
 * 공통 이벤트 리스너 설정
 */
function setupCommonEventListeners() {
    // 첫 번째 클릭 시 Pyodide 초기화
    document.addEventListener('click', initPyodide, { once: true });
    
    // 실행 버튼
    const runButton = document.getElementById('run-code');
    if (runButton) {
        runButton.addEventListener('click', () => {
            const code = getEditorValue();
            runPythonCode(code);
        });
    }
    
    // 지우기 버튼
    const clearButton = document.getElementById('clear-code');
    if (clearButton) {
        clearButton.addEventListener('click', () => {
            setEditorValue('');
            const output = document.getElementById('output');
            if (output) {
                output.textContent = '에디터를 지웠습니다.';
            }
        });
    }
    
    // 퀴즈 옵션들
    document.querySelectorAll('.quiz-option').forEach(option => {
        option.addEventListener('click', () => {
            const quizId = option.dataset.quiz;
            const isCorrect = option.dataset.answer === 'correct';
            handleQuizAnswer(quizId, option, isCorrect);
        });
    });
}

/**
 * 유틸리티 함수: 요소가 존재하는지 확인
 * @param {string} id - 확인할 요소의 ID
 * @returns {boolean} 요소 존재 여부
 */
function elementExists(id) {
    return document.getElementById(id) !== null;
}

/**
 * 유틸리티 함수: 안전한 요소 선택
 * @param {string} selector - CSS 선택자
 * @returns {HTMLElement|null} 선택된 요소 또는 null
 */
function safeQuerySelector(selector) {
    try {
        return document.querySelector(selector);
    } catch (error) {
        console.error(`선택자 오류: ${selector}`, error);
        return null;
    }
}

/**
 * 디버그 모드 확인
 * @returns {boolean} 디버그 모드 여부
 */
function isDebugMode() {
    return window.location.search.includes('debug=true');
}

// 전역 함수로 노출
window.MechDogLearning = {
    initCodeEditor,
    initBasicEditor,
    initPyodide,
    runPythonCode,
    updateProgress,
    handleQuizAnswer,
    getEditorValue,
    setEditorValue,
    setupCommonEventListeners,
    elementExists,
    safeQuerySelector,
    isDebugMode
}; 