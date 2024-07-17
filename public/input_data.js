document.addEventListener('DOMContentLoaded', () => {
    // Set today's date automatically
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.value = today;
    }

    // Form submission event listener
    const form = document.getElementById('dataForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            try {
                // Serialize form data into JSON object
                const formData = new FormData(form);
                const data = Object.fromEntries(formData);

                // Ensure b_actin field is captured correctly
                const bActinInput = document.getElementById('bActin');
                if (bActinInput) {
                    data.b_actin = bActinInput.value;
                }

                // 필드 이름 수정 및 기본값 설정
                data.CLDN10 = data.CLDN10 || '0';
                data.TIMP3 = data.TIMP3 || '0';
                data.MMP8 = data.MMP8 || '0';
                data.FLG = data.FLG || '0';
                data.AQP3 = data.AQP3 || '0';
                data.COL10A1 = data.COL10A1 || '0';

                console.log('전송할 데이터:', data);

                // Send data to the server
                const response = await fetch('/submit-results', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`서버 응답 오류: ${response.status}, 메시지: ${errorText}`);
                }

                const result = await response.json();
                if (result.success) {
                    alert('데이터가 성공적으로 전송되었습니다.');
                    
                    // Redirect to result_data.html with parameters
                    const params = new URLSearchParams({
                        bActin: data.b_actin,
                        average: data.average,
                        CLDN10: data.CLDN10,
                        TIMP3: data.TIMP3,
                        MMP8: data.MMP8,
                        FLG: data.FLG,
                        AQP3: data.AQP3,
                        COL10A1: data.COL10A1
                    });
                    window.location.href = `result_data.html?${params.toString()}`;
                } else {
                    alert('데이터 전송에 실패했습니다: ' + (result.message || '알 수 없는 오류'));
                }
            } catch (error) {
                console.error('Error:', error);
                alert(`데이터 전송 중 오류가 발생했습니다: ${error.message}`);
            }
        });
    } else {
        console.error('Form element not found');
    }
});