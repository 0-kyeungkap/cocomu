// utils.js

/**
 * contenteditable 요소 내 커서의 픽셀 위치를 계산하여 표시하는 함수
 * @param {HTMLElement} editableElement - contenteditable 요소
 * @param {HTMLElement} caretPositionElement - 커서 위치를 표시할 요소
 * @returns {Object} - { x: number, y: number }
 */
export function getCaretCoordinates(editableElement, caretPositionElement) {
  if (!(editableElement instanceof HTMLElement) || !(caretPositionElement instanceof HTMLElement)) {
    console.error("getCaretCoordinates에 전달된 요소가 유효하지 않습니다.");
    caretPositionElement.textContent = `커서 위치: (0px,0px)`;
    return { x: 0, y: 0 };
  }

  const selection = window.getSelection();

  // 선택된 범위가 없을 경우 커서 위치 초기화
  if (selection.rangeCount === 0) {
    caretPositionElement.textContent = `커서 위치: (0px,0px)`;
    return { x: 0, y: 0 };
  }

  // 현재 선택된 범위를 복제하고 커서 위치로 축소
  const range = selection.getRangeAt(0).cloneRange();
  range.collapse(true);

  // 임시 span 요소를 생성하여 커서 위치 계산
  const tempSpan = document.createElement('span');
  tempSpan.textContent = '\u200b'; // 제로 폭 공백
  range.insertNode(tempSpan);

  // 임시 span의 위치를 계산
  const rect = tempSpan.getBoundingClientRect();
  const parentRect = editableElement.getBoundingClientRect();

  // 상대적인 X, Y 좌표 계산
  const x = rect.left - parentRect.left;
  const y = rect.top - parentRect.top;

  // 커서 위치 표시 업데이트
  caretPositionElement.textContent = `커서 위치: (${Math.round(x)}px,${Math.round(y)}px)`;

  // 임시 span 요소 제거 (DOM 정리)
  tempSpan.parentNode.removeChild(tempSpan);

  return { x, y };
}

/**
 * 커서의 문자 오프셋을 반환하는 함수
 * @param {HTMLElement} element - 현재 포커스된 editable div
 * @returns {number|null} - 문자 오프셋 또는 null
 */
export function getCaretCharacterOffsetWithin(element) {
  let caretOffset = 0;
  const doc = element.ownerDocument || element.document;
  const win = doc.defaultView || doc.parentWindow;
  const sel = win.getSelection();

  if (sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    const preCaretRange = doc.createRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    caretOffset = preCaretRange.toString().length;
  }
  return caretOffset;
}

/**
 * contenteditable 요소 내에서 커서 위치를 설정하는 함수
 * @param {HTMLElement} element - contenteditable 요소
 * @param {number} offset - 커서를 설정할 문자 오프셋
 */
export function setCaretPosition(element, offset) {
  if (!element) return;

  const range = document.createRange();
  const sel = window.getSelection();

  // 기존 선택 영역 제거
  sel.removeAllRanges();

  let currentOffset = 0;
  let node = null;
  let nodeOffset = 0;

  function traverseNodes(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const textLength = node.textContent.length;
      if (currentOffset + textLength >= offset) {
        nodeOffset = offset - currentOffset;
        range.setStart(node, nodeOffset);
        range.collapse(true);
        sel.addRange(range);
        return true; // 찾았으므로 종료
      } else {
        currentOffset += textLength;
      }
    } else {
      for (let child of node.childNodes) {
        if (traverseNodes(child)) return true;
      }
    }
    return false;
  }

  traverseNodes(element);
}

/**
 * HTML 특수 문자를 이스케이프하여 XSS 공격을 방지하는 함수
 * @param {string} unsafe - 이스케이프할 문자열
 * @returns {string} - 이스케이프된 문자열
 */
export function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
  // 더 포괄적인 이스케이핑을 원할 경우 'he'와 같은 라이브러리 사용을 고려하세요.
}

/**
 * 현재 editable div의 이전 형제 요소 중 'editable' 클래스를 가진 div를 찾는 함수
 * @param {HTMLElement} currentDiv - 현재 editable div
 * @returns {HTMLElement|null} - 이전 editable div 또는 null
 */
export function findPreviousEditableDiv(currentDiv) {
  let prev = currentDiv.previousElementSibling;
  while (prev) {
    if (prev.classList.contains('editable')) {
      return prev;
    }
    prev = prev.previousElementSibling;
  }
  return null;
}

/**
 * 현재 editable div의 다음 형제 요소 중 'editable' 클래스를 가진 div를 찾는 함수
 * @param {HTMLElement} currentDiv - 현재 editable div
 * @returns {HTMLElement|null} - 다음 editable div 또는 null
 */
export function findNextEditableDiv(currentDiv) {
  let next = currentDiv.nextElementSibling;
  while (next) {
    if (next.classList.contains('editable')) {
      return next;
    }
    next = next.nextElementSibling;
  }
  return null;
}

/**
 * 지정된 editable div의 시작 위치에 커서를 설정하는 함수
 * @param {HTMLElement} editable - 커서를 설정할 editable div
 */
export function setCursorToStart(editable) {
  if (!(editable instanceof HTMLElement)) {
    console.error("setCursorToStart: editable은 HTMLElement가 아닙니다.", editable);
    return;
  }

  const selection = window.getSelection();
  const range = document.createRange();
  const firstNode = editable.firstChild || editable;

  range.setStart(firstNode, 0);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * 지정된 editable div의 끝 위치에 커서를 설정하는 함수
 * @param {HTMLElement} editable - 커서를 설정할 editable div
 */
export function setCursorToEnd(editable) {
  if (!(editable instanceof HTMLElement)) {
    console.error("setCursorToEnd: editable은 HTMLElement가 아닙니다.", editable);
    return;
  }

  const selection = window.getSelection();
  const range = document.createRange();
  const lastNode = editable.lastChild || editable;

  if (lastNode.nodeType === Node.TEXT_NODE) {
    range.setStart(lastNode, lastNode.textContent.length);
  } else {
    range.setStart(editable, editable.childNodes.length);
  }

  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * 지정된 editable div 내에서 커서가 첫 번째 줄에 있는지 확인하는 함수
 * @param {HTMLElement} editableElement - 검사할 contenteditable div
 * @returns {boolean} - 커서가 첫 번째 줄에 있으면 true, 아니면 false
 */
export function isCursorOnFirstLine(editableElement) {
  if (!(editableElement instanceof HTMLElement)) {
    console.warn("isCursorOnFirstLine: editableElement는 HTMLElement가 아닙니다.", editableElement);
    return false;
  }

  const currentY = getCursorYPosition(editableElement);
  if (currentY === null) return false;

  const startY = getStartYPosition(editableElement);

  return Math.abs(currentY - startY) < 1;
}

/**
 * 지정된 editable div 내에서 커서가 마지막 줄에 있는지 확인하는 함수
 * @param {HTMLElement} editableElement - 검사할 contenteditable div
 * @returns {boolean} - 커서가 마지막 줄에 있으면 true, 아니면 false
 */
export function isCursorOnLastLine(editableElement) {
  if (!(editableElement instanceof HTMLElement)) {
    console.warn("isCursorOnLastLine: editableElement는 HTMLElement가 아닙니다.", editableElement);
    return false;
  }

  const currentY = getCursorYPosition(editableElement);
  if (currentY === null) return false;

  const endY = getEndYPosition(editableElement);

  return Math.abs(currentY - endY) < 1;
}

/**
 * 지정된 editable div 내에서 주어진 X 좌표에 가장 가까운 위치로 커서를 설정하는 함수
 * @param {HTMLElement} editable - 커서를 설정할 target editable div
 * @param {number} desiredX - 목표 X 좌표 (픽셀 단위)
 * @param {string} position - 'first'는 첫 번째 줄, 'last'는 마지막 줄에서 설정
 */
export function setCursorClosestToX(editable, desiredX, position = 'first') {
  if (!(editable instanceof HTMLElement)) {
    console.error("setCursorClosestToX: editable은 HTMLElement가 아닙니다.", editable);
    return;
  }

  const selection = window.getSelection();
  if (!selection) return;

  const parentRect = editable.getBoundingClientRect();
  let closestOffset = null;
  let minDistance = Infinity;
  let closestNode = null;

  const targetY = position === 'first' ? getStartYPosition(editable) : getEndYPosition(editable);

  if (targetY === null) {
    console.warn(`setCursorClosestToX: ${position} Y 위치를 확인할 수 없습니다.`);
    return;
  }

  /**
   * 텍스트 노드 내에서 주어진 X 좌표에 가장 가까운 오프셋을 찾는 함수
   * @param {Node} node - 텍스트 노드
   */
  function findClosestOffsetInTextNode(node) {
    const textLength = node.textContent.length;

    if (textLength === 0) return;

    for (let i = 0; i <= textLength; i++) {
      const range = document.createRange();
      try {
        range.setStart(node, i);
        range.collapse(true);
      } catch (e) {
        console.warn(`노드의 길이가 ${textLength}인 상태에서 오프셋 ${i}는 유효하지 않습니다.`, e);
        continue;
      }

      const rect = range.getBoundingClientRect();
      const x = rect.left - parentRect.left;
      const y = rect.top - parentRect.top;

      if (Math.abs(y - targetY) < 1) {
        const distance = Math.abs(x - desiredX);
        if (distance < minDistance) {
          minDistance = distance;
          closestOffset = i;
          closestNode = node;
        }
      }
    }
  }

  /**
   * DOM 트리를 순회하며 모든 텍스트 노드를 처리하는 함수
   * @param {Node} node - 현재 노드
   */
  function traverse(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      findClosestOffsetInTextNode(node);
    } else {
      node.childNodes.forEach(child => traverse(child));
    }
  }

  // editable 요소부터 트리 순회 시작
  traverse(editable);

  // 가장 가까운 위치에 커서 설정
  if (closestNode !== null && closestOffset !== null) {
    try {
      const range = document.createRange();
      range.setStart(closestNode, closestOffset);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (e) {
      console.error(`노드에서 오프셋 ${closestOffset}에 커서를 설정하는 데 실패했습니다.`, e);
    }
  } else {
    // 적절한 위치를 찾지 못한 경우, 시작 또는 끝으로 이동
    if (position === 'first') {
      setCursorToStart(editable);
    } else if (position === 'last') {
      setCursorToEnd(editable);
    }
  }
}

/**
 * 커서의 Y 위치를 반환하는 헬퍼 함수
 * @param {HTMLElement} editableElement
 * @returns {number|null}
 */
function getCursorYPosition(editableElement) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return null;

  const range = selection.getRangeAt(0).cloneRange();
  range.collapse(true);

  const span = document.createElement('span');
  span.textContent = '\u200b'; // 제로 폭 공백
  range.insertNode(span);
  const rect = span.getBoundingClientRect();
  const parentRect = editableElement.getBoundingClientRect();
  const y = rect.top - parentRect.top;
  span.parentNode.removeChild(span);

  return y;
}

/**
 * editable 요소의 시작 Y 위치를 반환하는 헬퍼 함수
 * @param {HTMLElement} editableElement
 * @returns {number|null}
 */
function getStartYPosition(editableElement) {
  const range = document.createRange();
  range.setStart(editableElement.firstChild || editableElement, 0);
  range.collapse(true);

  const span = document.createElement('span');
  span.textContent = '\u200b';
  range.insertNode(span);
  const rect = span.getBoundingClientRect();
  const parentRect = editableElement.getBoundingClientRect();
  const y = rect.top - parentRect.top;
  span.parentNode.removeChild(span);

  return y;
}

/**
 * editable 요소의 끝 Y 위치를 반환하는 헬퍼 함수
 * @param {HTMLElement} editableElement
 * @returns {number|null}
 */
function getEndYPosition(editableElement) {
  const range = document.createRange();
  const lastNode = editableElement.lastChild || editableElement;
  if (lastNode.nodeType === Node.TEXT_NODE) {
    range.setStart(lastNode, lastNode.textContent.length);
  } else {
    range.setStart(editableElement, editableElement.childNodes.length);
  }
  range.collapse(true);

  const span = document.createElement('span');
  span.textContent = '\u200b';
  range.insertNode(span);
  const rect = span.getBoundingClientRect();
  const parentRect = editableElement.getBoundingClientRect();
  const y = rect.top - parentRect.top;
  span.parentNode.removeChild(span);

  return y;
}
