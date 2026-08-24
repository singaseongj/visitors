/* ============================================================
   CONFIG
   ============================================================ */

const COMMENT_API =
  'https://script.google.com/macros/s/AKfycbwzgjE6rU-1LWYzKFZBVExfqrkbXKCa72BTBvF0yIvbFljo68610KoA2KqxlEya5AE47g/exec';

const GOOGLE_WEB_CLIENT_ID =
  '768920190384-cspfvf030mo4klnedn2le10aidcpe6eo.apps.googleusercontent.com';


/* ============================================================
   ELEMENTS
   ============================================================ */

const commentForm =
  document.getElementById('commentForm');

const authorInput =
  document.getElementById('commentAuthor');

const passwordInput =
  document.getElementById('commentPassword');

const contentInput =
  document.getElementById('commentContent');

const submitButton =
  document.getElementById('submitButton');

const commentsContainer =
  document.getElementById('comments');

const statusMessage =
  document.getElementById('statusMessage');

const characterCount =
  document.getElementById('characterCount');

const googleAuthStatus =
  document.getElementById('googleAuthStatus');

const sortByDateButton =
  document.getElementById('sortByDate');

const sortByLikesButton =
  document.getElementById('sortByLikes');

const dateSortIndicator =
  document.getElementById('dateSortIndicator');

const likeSortIndicator =
  document.getElementById('likeSortIndicator');


/* ============================================================
   COMMENT STATE
   ============================================================ */

let loadedComments = [];

let currentSort = {
  field: 'date',
  direction: 'desc'
};

let googleCredential = '';
let pendingComment = null;
let googleIdentityInitialized = false;


/* ============================================================
   GOOGLE AUTHENTICATION
   ============================================================ */

function initializeGoogleIdentity() {
  if (googleIdentityInitialized) {
    return;
  }

  if (!window.google?.accounts?.id) {
    googleAuthStatus.textContent =
      'Google 로그인을 불러오지 못했습니다.';
    return;
  }

  google.accounts.id.initialize({
    client_id: GOOGLE_WEB_CLIENT_ID,
    callback: handleGoogleCredential,
    ux_mode: 'popup',
    auto_select: false
  });

  google.accounts.id.renderButton(
    document.getElementById('googleSignInButton'),
    {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      locale: 'ko'
    }
  );

  googleIdentityInitialized = true;
}


function handleGoogleCredential(response) {
  if (!response?.credential) {
    showStatus('Google 계정 인증에 실패했습니다.', 'error');
    return;
  }

  googleCredential = response.credential;
  googleAuthStatus.textContent = 'Google 로그인 완료';

  showStatus(
    'Google 계정 인증이 완료되었습니다. 댓글을 등록할 수 있습니다.',
    'success'
  );

  if (pendingComment) {
    const comment = pendingComment;
    pendingComment = null;
    postComment(comment);
  }
}


window.addEventListener('load', initializeGoogleIdentity);


/* ============================================================
   VISITOR ID
   ============================================================ */

function getVisitorId() {

  const key =
    'comment-visitor-id';

  let visitorId =
    localStorage.getItem(key);


  if (!visitorId) {

    if (
      typeof crypto !== 'undefined' &&
      typeof crypto.randomUUID === 'function'
    ) {

      visitorId =
        crypto.randomUUID();

    } else {

      visitorId =
        'visitor-' +
        Date.now() +
        '-' +
        Math.random()
          .toString(36)
          .substring(2);
    }


    localStorage.setItem(
      key,
      visitorId
    );
  }


  return visitorId;
}


/* ============================================================
   LIKE STORAGE
   ============================================================ */

function getLikeKey(commentId) {

  return (
    `comment-liked-${commentId}`
  );
}


function hasLiked(commentId) {

  return (
    localStorage.getItem(
      getLikeKey(commentId)
    ) !== null
  );
}


function rememberLike(commentId) {

  localStorage.setItem(
    getLikeKey(commentId),
    '1'
  );
}


/* ============================================================
   STATUS
   ============================================================ */

function showStatus(
  message,
  type = ''
) {

  statusMessage.textContent =
    message;

  statusMessage.className =
    'status-message';


  if (type === 'success') {

    statusMessage.classList.add(
      'status-success'
    );
  }


  if (type === 'error') {

    statusMessage.classList.add(
      'status-error'
    );
  }
}


/* ============================================================
   CHARACTER COUNT
   ============================================================ */

contentInput.addEventListener(
  'input',
  () => {

    characterCount.textContent =
      `${contentInput.value.length} / 100`;
  }
);


/* ============================================================
   DATE PARSER
   ============================================================ */

function parseCommentDate(dateString) {

  if (!dateString) {
    return 0;
  }

  const text =
    String(dateString).trim();


  /*
    Format 1:
    2026-08-14 10:23:45
  */

  const standardMatch =
    text.match(
      /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/
    );


  if (standardMatch) {

    const year =
      standardMatch[1];

    const month =
      standardMatch[2];

    const day =
      standardMatch[3];

    const hour =
      standardMatch[4];

    const minute =
      standardMatch[5];

    const second =
      standardMatch[6];


    return Date.parse(
      `${year}-${month}-${day}` +
      `T${hour}:${minute}:${second}+09:00`
    );
  }


  /*
    Format 2:
    Fri Aug 14 2026 10:23:45 GMT+0900 ...
  */

  const timestamp =
    Date.parse(text);


  if (Number.isNaN(timestamp)) {
    return 0;
  }


  return timestamp;
}


/* ============================================================
   DISPLAY DATE
   ============================================================ */

function formatDisplayDate(dateString) {

  if (!dateString) {
    return '';
  }


  const text =
    String(dateString).trim();


  /*
    Format 1:
    2026-08-14 10:23:45

    Display:
    2026/08/14
  */

  const standardMatch =
    text.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );


  if (standardMatch) {

    const year =
      standardMatch[1];

    const month =
      standardMatch[2];

    const day =
      standardMatch[3];


    return `${year}/${month}/${day}`;
  }


  /*
    Format 2:
    Fri Aug 14 2026 10:23:45 GMT+0900 ...
  */

  const date =
    new Date(text);


  if (Number.isNaN(date.getTime())) {
    return '';
  }


  const parts =
    new Intl.DateTimeFormat(
      'en-US',
      {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }
    ).formatToParts(date);


  const year =
    parts.find(
      part => part.type === 'year'
    )?.value;


  const month =
    parts.find(
      part => part.type === 'month'
    )?.value;


  const day =
    parts.find(
      part => part.type === 'day'
    )?.value;


  if (!year || !month || !day) {
    return '';
  }


  return `${year}/${month}/${day}`;
}


/* ============================================================
   SORT COMMENTS
   ============================================================ */

function sortAndRenderComments() {

  const comments =
    [...loadedComments];


  if (currentSort.field === 'date') {

    comments.sort(
      (a, b) => {

        const dateA =
          parseCommentDate(a.date);

        const dateB =
          parseCommentDate(b.date);


        if (
          currentSort.direction === 'desc'
        ) {

          return dateB - dateA;
        }


        return dateA - dateB;
      }
    );
  }


  if (currentSort.field === 'likes') {

    comments.sort(
      (a, b) => {

        const likesA =
          Number(a.likes) || 0;

        const likesB =
          Number(b.likes) || 0;


        if (
          currentSort.direction === 'desc'
        ) {

          return likesB - likesA;
        }


        return likesA - likesB;
      }
    );
  }


  renderComments(comments);

  updateSortIndicators();
}


/* ============================================================
   SORT INDICATORS
   ============================================================ */

function updateSortIndicators() {

  dateSortIndicator.textContent =
    '';

  likeSortIndicator.textContent =
    '';


  if (currentSort.field === 'date') {

    dateSortIndicator.textContent =
      currentSort.direction === 'desc'
        ? '↓'
        : '↑';
  }


  if (currentSort.field === 'likes') {

    likeSortIndicator.textContent =
      currentSort.direction === 'desc'
        ? '↓'
        : '↑';
  }
}


/* ============================================================
   DATE SORT BUTTON
   ============================================================ */

sortByDateButton.addEventListener(
  'click',
  () => {

    if (currentSort.field === 'date') {

      currentSort.direction =
        currentSort.direction === 'desc'
          ? 'asc'
          : 'desc';

    } else {

      currentSort.field =
        'date';

      currentSort.direction =
        'desc';
    }


    sortAndRenderComments();
  }
);


/* ============================================================
   LIKE SORT BUTTON
   ============================================================ */

sortByLikesButton.addEventListener(
  'click',
  () => {

    if (currentSort.field === 'likes') {

      currentSort.direction =
        currentSort.direction === 'desc'
          ? 'asc'
          : 'desc';

    } else {

      currentSort.field =
        'likes';

      currentSort.direction =
        'desc';
    }


    sortAndRenderComments();
  }
);


/* ============================================================
   LOAD COMMENTS
   ============================================================ */

async function loadComments() {

  commentsContainer.innerHTML = `
    <tr>
      <td
        colspan="4"
        class="table-message"
      >
        댓글을 불러오는 중...
      </td>
    </tr>
  `;


  try {

    const response =
      await fetch(
        COMMENT_API,
        {
          method: 'GET',
          cache: 'no-store'
        }
      );


    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status}`
      );
    }


    const data =
      await response.json();


    if (!data.success) {

      throw new Error(
        data.error ||
        '댓글을 불러오지 못했습니다.'
      );
    }


    loadedComments =
      Array.isArray(data.comments)
        ? data.comments
        : [];


    sortAndRenderComments();


  } catch (error) {

    console.error(
      'Failed to load comments:',
      error
    );


    commentsContainer.innerHTML = `
      <tr>
        <td
          colspan="4"
          class="table-message"
        >
          댓글을 불러오지 못했습니다.
        </td>
      </tr>
    `;
  }
}


/* ============================================================
   RENDER COMMENTS
   ============================================================ */

function renderComments(comments) {

  commentsContainer.replaceChildren();


  if (
    !Array.isArray(comments) ||
    comments.length === 0
  ) {

    const row =
      document.createElement('tr');


    const cell =
      document.createElement('td');


    cell.colSpan =
      4;

    cell.className =
      'table-message';

    cell.textContent =
      '아직 댓글이 없습니다.';


    row.appendChild(cell);

    commentsContainer.appendChild(row);

    return;
  }


  for (const comment of comments) {

    commentsContainer.appendChild(
      createCommentRow(comment)
    );
  }
}


/* ============================================================
   CREATE COMMENT ROW
   ============================================================ */

function createCommentRow(comment) {

  const row =
    document.createElement('tr');


  /* DATE */

  const dateCell =
    document.createElement('td');

  dateCell.className =
    'comment-date-cell';

  dateCell.textContent =
    formatDisplayDate(comment.date);


  /* CONTENT */

  const contentCell =
    document.createElement('td');

  contentCell.className =
    'comment-content-cell';

  contentCell.textContent =
    comment.content || '';

  contentCell.title =
    comment.content || '';


  /* AUTHOR */

  const authorCell =
    document.createElement('td');

  authorCell.className =
    'comment-author-cell';

  authorCell.textContent =
    comment.author || '';


  /* ACTION CELL */

  const actionCell =
    document.createElement('td');


  const actions =
    document.createElement('div');

  actions.className =
    'comment-actions';


  /* LIKE BUTTON */

  const likeButton =
    document.createElement('button');

  likeButton.type =
    'button';

  likeButton.className =
    'like-button';


  const heart =
    document.createElement('span');

  heart.className =
    'heart';

  heart.textContent =
    '♥';


  const likeCount =
    document.createElement('span');

  likeCount.className =
    'like-count';

  likeCount.textContent =
    String(
      Number(comment.likes) || 0
    );


  likeButton.append(
    heart,
    likeCount
  );


  if (hasLiked(comment.id)) {

    likeButton.classList.add(
      'liked'
    );

    likeButton.disabled =
      true;
  }


  likeButton.addEventListener(
    'click',
    () => {

      likeComment(
        comment.id,
        likeButton,
        likeCount
      );
    }
  );


  /* DELETE BUTTON */

  const deleteButton =
    document.createElement('button');

  deleteButton.type =
    'button';

  deleteButton.className =
    'delete-button';

  deleteButton.textContent =
    '삭제';


  deleteButton.addEventListener(
    'click',
    () => {

      deleteComment(
        comment.id,
        deleteButton
      );
    }
  );


  actions.append(
    likeButton,
    deleteButton
  );


  actionCell.appendChild(
    actions
  );


  row.append(
    dateCell,
    contentCell,
    authorCell,
    actionCell
  );


  return row;
}


/* ============================================================
   POST COMMENT
   ============================================================ */

commentForm.addEventListener(
  'submit',
  async event => {
    event.preventDefault();

    const author = authorInput.value.trim();
    const password = passwordInput.value;
    const content = contentInput.value.trim();

    if (!author) {
      showStatus('작성자를 입력하세요.', 'error');
      authorInput.focus();
      return;
    }

    if (author.length > 30) {
      showStatus('작성자는 30자 이하로 입력하세요.', 'error');
      return;
    }

    if (!password) {
      showStatus('비밀번호를 입력하세요.', 'error');
      passwordInput.focus();
      return;
    }

    if (password.length < 4 || password.length > 64) {
      showStatus('비밀번호는 4~64자로 입력하세요.', 'error');
      passwordInput.focus();
      return;
    }

    if (!content) {
      showStatus('내용을 입력하세요.', 'error');
      contentInput.focus();
      return;
    }

    if (content.length > 100) {
      showStatus('내용은 100자 이하로 입력하세요.', 'error');
      return;
    }

    const comment = { author, password, content };

    if (!googleCredential) {
      pendingComment = comment;
      showStatus(
        '댓글을 등록하려면 먼저 Google 계정으로 로그인하세요.',
        'error'
      );
      return;
    }

    await postComment(comment);
  }
);


async function postComment({ author, password, content }) {
  submitButton.disabled = true;
  showStatus('댓글을 등록하는 중...');

  try {
    const body = new URLSearchParams();
    body.set('action', 'comment');
    body.set('author', author);
    body.set('password', password);
    body.set('content', content);
    body.set('credential', googleCredential);

    const response = await fetch(COMMENT_API, {
      method: 'POST',
      body
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || '댓글 작성에 실패했습니다.');
    }

    passwordInput.value = '';
    contentInput.value = '';
    characterCount.textContent = '0 / 100';
    showStatus('댓글이 등록되었습니다.', 'success');
    await loadComments();
  } catch (error) {
    console.error('Failed to post comment:', error);
    showStatus(error.message || '댓글 작성에 실패했습니다.', 'error');
  } finally {
    submitButton.disabled = false;
  }
}

/* ============================================================
   LIKE
   ============================================================ */

async function likeComment(
  commentId,
  button,
  countElement
) {

  if (!commentId) {
    return;
  }


  if (hasLiked(commentId)) {

    button.classList.add(
      'liked'
    );

    button.disabled =
      true;

    return;
  }


  button.disabled =
    true;


  try {

    const body =
      new URLSearchParams();


    body.set(
      'action',
      'like'
    );

    body.set(
      'id',
      commentId
    );

    body.set(
      'visitorId',
      getVisitorId()
    );


    const response =
      await fetch(
        COMMENT_API,
        {
          method: 'POST',
          body
        }
      );


    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status}`
      );
    }


    const data =
      await response.json();


    if (
      !data.success &&
      data.error === 'Already liked.'
    ) {

      rememberLike(
        commentId
      );


      button.classList.add(
        'liked'
      );

      button.disabled =
        true;

      return;
    }


    if (!data.success) {

      throw new Error(
        data.error ||
        '좋아요 처리에 실패했습니다.'
      );
    }


    rememberLike(
      commentId
    );


    countElement.textContent =
      String(
        Number(data.likes) || 0
      );


    const storedComment =
      loadedComments.find(
        comment =>
          String(comment.id) ===
          String(commentId)
      );


    if (storedComment) {

      storedComment.likes =
        Number(data.likes) || 0;
    }


    button.classList.add(
      'liked'
    );

    button.disabled =
      true;


    if (currentSort.field === 'likes') {

      sortAndRenderComments();
    }


  } catch (error) {

    console.error(
      'Failed to like comment:',
      error
    );


    if (!hasLiked(commentId)) {

      button.disabled =
        false;
    }
  }
}


/* ============================================================
   DELETE
   ============================================================ */

async function deleteComment(
  commentId,
  button
) {

  if (!commentId) {
    return;
  }


  const password =
    prompt(
      '댓글 작성 시 사용한 비밀번호를 입력하세요.'
    );


  if (password === null) {
    return;
  }


  if (!password) {

    alert(
      '비밀번호를 입력하세요.'
    );

    return;
  }


  const confirmed =
    confirm(
      '이 댓글을 삭제하시겠습니까?'
    );


  if (!confirmed) {
    return;
  }


  button.disabled =
    true;


  try {

    const body =
      new URLSearchParams();


    body.set(
      'action',
      'delete'
    );

    body.set(
      'id',
      commentId
    );

    body.set(
      'password',
      password
    );


    const response =
      await fetch(
        COMMENT_API,
        {
          method: 'POST',
          body
        }
      );


    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status}`
      );
    }


    const data =
      await response.json();


    if (!data.success) {

      throw new Error(
        data.error ||
        '댓글 삭제에 실패했습니다.'
      );
    }


    loadedComments =
      loadedComments.filter(
        comment =>
          String(comment.id) !==
          String(commentId)
      );


    showStatus(
      '댓글이 삭제되었습니다.',
      'success'
    );


    sortAndRenderComments();


  } catch (error) {

    console.error(
      'Failed to delete comment:',
      error
    );


    alert(
      error.message ||
      '댓글 삭제에 실패했습니다.'
    );


    button.disabled =
      false;
  }
}


/* ============================================================
   INITIAL LOAD
   ============================================================ */

loadComments();
