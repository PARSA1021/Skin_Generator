document.addEventListener('DOMContentLoaded', () => {
    // Set today's date automatically
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;

    // Form submission event listener
    document.getElementById('dataForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        try {
            // Serialize form data into JSON object
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);

            // Ensure b_actin field is captured correctly
            data.b_actin = document.getElementById('bActin').value;

            // Send data to the server
            const response = await fetch('/submit-results', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error('서버에서 오류가 발생했습니다.');
            }

            const result = await response.json();
            if (result.success) {
                alert('데이터가 성공적으로 전송되었습니다.');
                
                // Redirect to result_data.html with parameters
                const params = new URLSearchParams({
                    bActin: data.b_actin,
                    average: data.average,
                    a: data.a,
                    b: data.b,
                    c: data.c,
                    d: data.d,
                    e: data.e,
                    f: data.f
                });
                window.location.href = `result_data.html?${params.toString()}`;
            } else {
                alert('데이터 전송에 실패했습니다: ' + result.message);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('데이터 전송 중 오류가 발생했습니다.');
        }
    });
});