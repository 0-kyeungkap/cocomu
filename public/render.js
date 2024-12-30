// render.js

/**
 * LaTeX 수식을 렌더링하여 editable div에 삽입하는 함수
 * @param {HTMLElement} editable - 수식을 렌더링할 div
 * @param {string} latex - LaTeX 수식 문자열
 */
export function renderEquation(editable, latex) {
    editable.classList.add('equation'); // 수식 스타일 추가
    editable.setAttribute('contenteditable', 'false'); // 편집 비활성화
    editable.dataset.latex = latex; // LaTeX 코드 저장
    editable.innerHTML = `\\[${latex}\\]`; // LaTeX 수식 삽입

    // MathJax 재렌더링 트리거
    MathJax.typesetPromise([editable]).then(() => {
        console.log('MathJax 렌더링 완료');
    }).catch((err) => console.error('MathJax 렌더링 에러:', err));
}

/**
 * 제목을 H1 태그로 렌더링하는 함수
 * @param {HTMLElement} editable - 제목을 렌더링할 div
 * @param {string} title - 제목 텍스트
 */
export function renderTitle(editable, title) {
    editable.classList.add('heading1');
    editable.setAttribute('contenteditable', 'false');
    editable.dataset.title = title;
    editable.innerHTML = `<h1>${title}</h1>`;
}

/**
 * 제목을 H2 태그로 렌더링하는 함수
 * @param {HTMLElement} editable - 제목을 렌더링할 div
 * @param {string} heading - 제목 텍스트
 */
export function renderHeading2(editable, heading) {
    editable.classList.add('heading2');
    editable.setAttribute('contenteditable', 'false');
    editable.dataset.heading2 = heading;
    editable.innerHTML = `<h2>${heading}</h2>`;
}

/**
 * 제목을 H3 태그로 렌더링하는 함수
 * @param {HTMLElement} editable - 제목을 렌더링할 div
 * @param {string} heading - 제목 텍스트
 */
export function renderHeading3(editable, heading) {
    editable.classList.add('heading3');
    editable.setAttribute('contenteditable', 'false');
    editable.dataset.heading3 = heading;
    editable.innerHTML = `<h3>${heading}</h3>`;
}

/**
 * 포커스가 벗어났을 때의 처리 함수
 * @param {HTMLElement} editable - 포커스를 잃은 editable div
 */
export function handleFocusOut(editable) {
    const content = editable.textContent.trim();
    if (content.startsWith('/')) {
        const latex = content.substring(1).trim();
        if (latex.length > 0) {
            renderEquation(editable, latex);
        }
    }
    else if (content.startsWith('###')) { // H3 처리 추가
        const heading = content.substring(3).trim();
        if (heading.length > 0) {
            renderHeading3(editable, heading);
        }
    }
    else if (content.startsWith('##')) { // H2 처리
        const heading = content.substring(2).trim();
        if (heading.length > 0) {
            renderHeading2(editable, heading);
        }
    }
    else if (content.startsWith('#')) { // H1 처리
        const title = content.substring(1).trim();
        if (title.length > 0) {
            renderTitle(editable, title);
        }
    }
}
