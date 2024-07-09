document.addEventListener("DOMContentLoaded", async function() {
    try {
        // URL에서 파라미터 가져오기
        const urlParams = new URLSearchParams(window.location.search);
        const result = {
            b_actin: urlParams.get('bActin'),
            average: urlParams.get('average'),
            a: urlParams.get('a'),
            b: urlParams.get('b'),
            c: urlParams.get('c'),
            d: urlParams.get('d'),
            e: urlParams.get('e'),
            f: urlParams.get('f')
        };

        console.log('Received result:', result);

        // 데이터 유효성 검사
        if (!result.b_actin || !result.average || !result.a || !result.b || !result.c || !result.d || !result.e || !result.f) {
            throw new Error('일부 필요한 데이터가 누락되었습니다.');
        }

        const bActin = parseFloat(result.b_actin);
        const average = parseFloat(result.average);

        if (isNaN(bActin) || isNaN(average)) {
            throw new Error('결과에서 유효하지 않은 숫자 값이 반환되었습니다.');
        }

        const values = createValuesArray(result, ['a', 'b', 'c', 'd', 'e', 'f'], bActin);
        console.log('Parsed values:', values);

        displayResults(values, average);
    } catch (error) {
        console.error('Error processing results:', error);
        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = `<p>결과를 처리하는 동안 문제가 발생했습니다: ${error.message}</p>`;
    }
});

function createValuesArray(result, params, bActin) {
    return params.map(param => ({
        name: param,
        value: parseFloat(result[param]),
        result: parseFloat(result[param]) - bActin
    }));
}

function displayResults(values, average) {
    const resultsDiv = document.getElementById('results');
    let resultHTML = '<ul>';

    values.forEach(item => {
        const comparison = item.result > average ? '+' : '-';
        resultHTML += `<li>${item.name.toUpperCase()}: ${item.result.toFixed(2)} (${comparison})</li>`;
    });

    resultHTML += '</ul>';
    resultsDiv.innerHTML = resultHTML;
}