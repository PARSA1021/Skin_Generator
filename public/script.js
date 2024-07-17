// 공통적으로 사용되는 fetch 함수
async function fetchData(url, method, body) {
    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        return await response.json();
    } catch (error) {
        console.error('네트워크 오류:', error);
        throw new Error('네트워크 오류가 발생했습니다.');
    }
}

// 전화번호 유효성 검사 함수
function validatePhoneNumber(phone) {
    const phoneRegex = /^010-\d{4}-\d{4}$/;
    return phoneRegex.test(phone);
}

// 비밀번호 유효성 검사 함수 (6자리 숫자만 허용)
function validatePassword(password) {
    const passwordRegex = /^\d{6}$/;  // 정규 표현식을 6자리 숫자로 변경
    return passwordRegex.test(password);
}

// 로그인 함수
async function login() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const data = await fetchData('/login', 'POST', { username, password });

        if (data.success) {
            localStorage.setItem('userId', data.userID);
            alert('로그인 성공!');
            // 로그인 성공 후 처리 로직 추가
            window.location.href = 'input_data.html'; // 로그인 성공 시 리다이렉트
        } else {
            alert(data.message || '로그인 실패. 사용자 이름 또는 비밀번호를 확인해주세요.');
        }
    } catch (error) {
        alert('로그인 중 오류가 발생했습니다. 나중에 다시 시도해주세요.');
    }
}

// 회원가입 함수
async function register() {
    const username = document.getElementById('registerUsername').value;
    const birthdate = document.getElementById('registerBirthdate').value;
    const phone = document.getElementById('registerPhone').value;
    const password = document.getElementById('registerPassword').value;

    if (!validatePhoneNumber(phone)) {
        alert('올바른 전화번호 형식이 아닙니다. (예: 010-1234-5678)');
        return;
    }

    if (!validatePassword(password)) {
        alert('비밀번호는 최소 8자 이상이며, 문자, 숫자, 특수문자를 각각 하나 이상 포함해야 합니다.');
        return;
    }

    try {
        const data = await fetchData('/register', 'POST', { username, phone, password, birthdate });

        if (data.success) {
            alert('회원가입 성공!');
            window.location.href = 'login.html'; // 회원가입 성공 시 로그인 페이지로 리다이렉트
        } else {
            alert(data.message || '회원가입 실패. 이미 존재하는 사용자 이름일 수 있습니다.');
        }
    } catch (error) {
        alert('회원가입 중 오류가 발생했습니다. 나중에 다시 시도해주세요.');
    }
}

// 비밀번호 가리기/보이기 토글 함수
function togglePasswordVisibility(inputId) {
    const passwordInput = document.getElementById(inputId);
    const toggleIcon = document.getElementById('toggleIcon');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    } else {
        passwordInput.type = 'password';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    }
}