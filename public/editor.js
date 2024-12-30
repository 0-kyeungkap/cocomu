// editor.js

import {
    getCaretCoordinates,
    findPreviousEditableDiv,
    findNextEditableDiv,
    setCursorToStart,
    setCursorToEnd,
    isCursorOnFirstLine,
    isCursorOnLastLine,
    setCursorClosestToX,
    getCaretCharacterOffsetWithin,
    setCaretPosition
} from './utils.js';

import {
    renderEquation,
    renderTitle,
    renderHeading2,
    renderHeading3, // H3 렌더링 함수 추가
    handleFocusOut
} from './render.js';

// 요소 선택
const editorContainer = document.getElementById('editor-container');
const caretPosition = document.getElementById('caret-position');

// 구성 상태를 추적하는 플래그
let isComposing = false;

// 원하는 X 좌표를 저장하는 변수
let desiredX = 0;

// HTML Fragment를 문자열로 변환하는 유틸리티 함수
function fragmentToHTML(fragment) {
    const div = document.createElement('div');
    div.appendChild(fragment.cloneNode(true));
    return div.innerHTML;
}

/**
 * 커서 위치를 업데이트하고 desiredX를 저장하는 핸들러 함수
 * @param {HTMLElement} editable - 현재 포커스된 editable div
 */
function handleCaretPositionHandler(editable) {
    const coords = getCaretCoordinates(editable, caretPosition);
    desiredX = coords.x;
}

/**
 * 새로운 editable div를 생성하여 에디터 컨테이너에 추가하는 함수
 * @param {HTMLElement} referenceDiv - 새로운 div를 삽입할 기준이 되는 div
 * @param {string} [content] - 새로운 div에 추가할 초기 내용
 * @returns {HTMLElement} - 생성된 editable div
 */
function createNewEditableDiv(referenceDiv, content = '') {
    const newDiv = document.createElement('div');
    newDiv.classList.add('editable');
    newDiv.setAttribute('contenteditable', 'true');
    newDiv.innerHTML = content ? content : '\u200b'; // 빈 div는 제로 폭 공백 추가

    // referenceDiv의 다음 형제로 삽입
    referenceDiv.parentNode.insertBefore(newDiv, referenceDiv.nextSibling);

    return newDiv;
}

/**
 * 새로 생성된 editable div로 커서를 이동시키는 함수
 * @param {HTMLElement} editable - 커서를 이동시킬 editable div
 * @param {string} position - 'start' 또는 'end'
 */
function moveCursorToEditable(editable, position = 'start') {
    setTimeout(() => {
        editable.focus();
        if (position === 'start') {
            setCursorToStart(editable);
        } else if (position === 'end') {
            setCursorToEnd(editable);
        }
    }, 0);
}

/**
 * 엔터키 처리를 위한 핸들러 함수
 * @param {KeyboardEvent} event - 키보드 이벤트
 * @param {HTMLElement} editable - 현재 포커스된 editable div
 */
function handleEnterKey(event, editable) {
    if (event.key === 'Enter') {
        event.preventDefault(); // 기본 엔터키 동작 방지

        try {
            // 현재 선택 영역 가져오기
            const selection = window.getSelection();
            if (!selection.rangeCount) {
                console.warn('No selection range available');
                return;
            }

            const range = selection.getRangeAt(0).cloneRange();

            const caretPos = getCaretCharacterOffsetWithin(editable);

            // editable div의 시작부터 현재 커서 위치까지의 범위 생성 (beforeRange)
            const beforeRange = range.cloneRange();
            beforeRange.selectNodeContents(editable);
            beforeRange.setEnd(range.startContainer, range.startOffset);

            // 현재 커서 위치부터 editable div의 끝까지의 범위 생성 (afterRange)
            const afterRange = range.cloneRange();
            afterRange.selectNodeContents(editable);
            afterRange.setStart(range.startContainer, range.startOffset);

            // before 콘텐츠 추출 및 HTML로 변환
            const beforeFragment = beforeRange.cloneContents();
            const beforeContent = fragmentToHTML(beforeFragment);

            // after 콘텐츠 추출 및 HTML로 변환
            const afterFragment = afterRange.cloneContents();
            const afterContent = fragmentToHTML(afterFragment);

            // 기존 editable div의 내용을 beforeContent로 업데이트
            editable.innerHTML = beforeContent;

            // 새로운 editable div 생성 및 afterContent 설정
            const newEditable = createNewEditableDiv(editable, afterContent);

            // 상태 캡처 후 DOM 변경
            setTimeout(() => {
                // 커서를 새로운 div로 이동
                moveCursorToEditable(newEditable, 'start');
            }, 0);

        } catch (error) {
            console.error('handleEnterKey error:', error);
        }
    }
}

/**
 * 백스페이스 키 처리를 위한 핸들러 함수
 * @param {KeyboardEvent} event - 키보드 이벤트
 * @param {HTMLElement} editable - 현재 포커스된 editable div
 */
function handleBackspaceKey(event, editable) {
    if (event.key === 'Backspace') {
        // editable div의 내용이 비어있거나 제로 폭 공백만 있는지 확인
        const content = editable.innerHTML.trim();
        if (content === '' || content === '\u200b') {
            event.preventDefault(); // 기본 백스페이스 동작 방지

            const previousDiv = findPreviousEditableDiv(editable);
            const parent = editable.parentNode;

            // 현재 editable div 삭제
            parent.removeChild(editable);

            if (previousDiv) {
                // 이전 div가 있을 경우 커서를 이전 div의 끝으로 이동
                setTimeout(() => {
                    moveCursorToEditable(previousDiv, 'end');
                }, 0);
            } else {
                // 이전 div가 없을 경우 새로운 빈 div 생성 및 커서 이동
                const newEditable = createNewEditableDiv(parent, '');
                setTimeout(() => {
                    moveCursorToEditable(newEditable, 'start');
                }, 0);
            }
        }
    }
}

/**
 * 제목 렌더링된 div를 편집 가능하도록 변환하는 함수 (H1, H2, H3 통합)
 * @param {HTMLElement} headingDiv - 제목 렌더링된 div
 */
function transformHeadingToEditableDiv(headingDiv) {
    let content = '';
    if (headingDiv.classList.contains('heading1')) {
        content = `#${headingDiv.dataset.title || ''}`;
        headingDiv.classList.remove('heading1');
        headingDiv.removeAttribute('data-title');
    } else if (headingDiv.classList.contains('heading2')) {
        content = `##${headingDiv.dataset.heading2 || ''}`;
        headingDiv.classList.remove('heading2');
        headingDiv.removeAttribute('data-heading2'); // 수정
    } else if (headingDiv.classList.contains('heading3')) { // H3 처리 추가
        content = `###${headingDiv.dataset.heading3 || ''}`;
        headingDiv.classList.remove('heading3');
        headingDiv.removeAttribute('data-heading3'); // 수정
    }
    headingDiv.setAttribute('contenteditable', 'true'); // 편집 가능으로 설정
    headingDiv.innerHTML = content; // 제목 텍스트 삽입
    headingDiv.focus(); // 포커스 설정
    setCursorToEnd(headingDiv); // 커서를 끝으로 이동
}

/**
 * 수식 렌더링된 div를 편집 가능하도록 변환하는 함수
 * @param {HTMLElement} equationDiv - 수식 렌더링된 div
 */
function transformEquationToEditableDiv(equationDiv) {
    const latex = equationDiv.dataset.latex || '';
    equationDiv.classList.remove('equation'); // 수식 클래스 제거
    equationDiv.setAttribute('contenteditable', 'true'); // 편집 가능으로 설정
    equationDiv.innerHTML = `/${latex}`; // '/'로 시작하는 LaTeX 코드 삽입
    equationDiv.removeAttribute('data-latex'); // 데이터 속성 제거
    equationDiv.focus(); // 포커스 설정
    setCursorToEnd(equationDiv); // 커서를 끝으로 이동
}

/**
 * 이벤트 위임을 사용하여 모든 editable div에 대해 이벤트 핸들링
 */
editorContainer.addEventListener('keydown', (event) => {
    const target = event.target;
    if (!target.classList.contains('editable') &&
        !target.classList.contains('heading1') &&
        !target.classList.contains('heading2') &&
        !target.classList.contains('heading3') &&
        !target.classList.contains('equation')) return;

    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        if (isComposing) {
            // 구성 중일 때는 엔터키 처리하지 않음
            return;
        }
        handleEnterKey(event, target);
    }
    else if (event.key === 'ArrowUp') {
        if (isComposing) return;

        // 커서가 첫 번째 줄에 있는지 확인
        const onFirstLine = isCursorOnFirstLine(target);

        if (onFirstLine) {
            event.preventDefault();
            const previousDiv = findPreviousEditableDiv(target);
            if (previousDiv) {
                // 이전 div의 마지막 위치로 커서 설정
                setCursorClosestToX(previousDiv, desiredX, 'last');

                // 만약 이전 div가 수식 div나 H1, H2, H3 제목 div라면 편집 모드로 전환
                if (previousDiv.classList.contains('equation')) {
                    transformEquationToEditableDiv(previousDiv);
                }
                else if (previousDiv.classList.contains('heading1') ||
                         previousDiv.classList.contains('heading2') ||
                         previousDiv.classList.contains('heading3')) {
                    transformHeadingToEditableDiv(previousDiv);
                }
            }
            // else: 기본 동작 수행 (커서를 위로 이동)
        }
    }
    else if (event.key === 'ArrowDown') {
        if (isComposing) return;

        // 커서가 마지막 줄에 있는지 확인
        const onLastLine = isCursorOnLastLine(target);

        if (onLastLine) {
            event.preventDefault();
            const nextDiv = findNextEditableDiv(target);
            if (nextDiv) {
                // 다음 div의 첫 번째 위치로 커서 설정
                setCursorClosestToX(nextDiv, desiredX, 'first');

                // 만약 다음 div가 수식 div나 H1, H2, H3 제목 div라면 편집 모드로 전환
                if (nextDiv.classList.contains('equation')) {
                    transformEquationToEditableDiv(nextDiv); // 수정
                }
                else if (nextDiv.classList.contains('heading1') ||
                         nextDiv.classList.contains('heading2') ||
                         nextDiv.classList.contains('heading3')) {
                    transformHeadingToEditableDiv(nextDiv); // 수정
                }
            }
            // else: 기본 동작 수행 (커서를 아래로 이동)
        }
    }
    else if (event.key === 'Backspace') {
        if (isComposing) return;
        handleBackspaceKey(event, target);
    }
    else if (event.key === '/' && target.innerHTML.trim() === '') {
        event.preventDefault(); // 기본 동작 방지
        // 사용자가 '/'를 입력하면 해당 div를 수식 입력 모드로 전환
        // 이 부분은 handleFocusOut에서 처리하므로 별도의 변환은 필요하지 않음
        return;
    }
    else if (event.key === '#' && target.innerHTML.trim() === '') {
        // 사용자가 '#' 또는 '##'을 입력할 때의 추가 로직이 필요하면 여기에 추가
        // 현재는 handleFocusOut에서 처리하므로 별도의 변환은 필요하지 않음
        return;
    }

});

/**
 * 수식 렌더링된 div를 클릭했을 때 편집 모드로 전환하는 이벤트 핸들러
 */
editorContainer.addEventListener('click', (event) => {
    const target = event.target;
    const parent  = target.parentElement;
    const equationClasses = ['equation'];
    const headingClasses = ['heading1', 'heading2', 'heading3'];

    // 클릭한 요소와 부모 요소를 배열로 묶기
    const elementsToCheck = [target, parent];

    for (let element of elementsToCheck) {
        if (!element) continue; // 부모 요소가 없을 경우 건너뜀

        if (equationClasses.some(cls => element.classList.contains(cls))) {
            transformEquationToEditableDiv(element);
            return; // 해당 작업을 수행한 후 함수 종료
        }

        if (headingClasses.some(cls => element.classList.contains(cls))) {
            transformHeadingToEditableDiv(element);
            return; // 해당 작업을 수행한 후 함수 종료
        }
    }
});

/**
 * 포커스 아웃(blur) 이벤트를 통해 수식 및 제목 렌더링 트리거
 */
editorContainer.addEventListener('focusout', (event) => {
    const target = event.target;
    if (target.classList.contains('editable') &&
        !target.classList.contains('equation') &&
        !target.classList.contains('heading1') &&
        !target.classList.contains('heading2') &&
        !target.classList.contains('heading3')) {
        handleFocusOut(target);
    } else if (target.classList.contains('heading1') ||
            target.classList.contains('heading2') ||
            target.classList.contains('heading3')) {
        handleFocusOut(target);
    }
});

/**
 * 구성 시작 시 플래그 설정
 */
editorContainer.addEventListener('compositionstart', () => {
    isComposing = true;
});

/**
 * 구성 종료 시 플래그 해제 및 커서 위치 업데이트
 */
editorContainer.addEventListener('compositionend', (event) => {
    isComposing = false;
    const target = event.target;
    if (target.classList.contains('editable') ||
        target.classList.contains('heading1') ||
        target.classList.contains('heading2') ||
        target.classList.contains('heading3')) {
        handleCaretPositionHandler(target);
    }
});

/**
 * 커서 위치 업데이트 이벤트 핸들러 등록
 */
const updateCaretEvents = ['keyup', 'click', 'input', 'mouseup'];
updateCaretEvents.forEach(eventType => {
    editorContainer.addEventListener(eventType, (event) => {
        const target = event.target;
        if (target.classList.contains('editable') ||
            target.classList.contains('heading1') ||
            target.classList.contains('heading2') ||
            target.classList.contains('heading3')) {
            handleCaretPositionHandler(target);
        }
    });
});

/**
 * 페이지 로드 시 초기 커서 위치 설정
 */
window.addEventListener('load', () => {
    const initialEditable = editorContainer.querySelector('.editable');
    handleCaretPositionHandler(initialEditable);
    setCaretPosition(initialEditable, 0);
});
