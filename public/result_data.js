document.addEventListener("DOMContentLoaded", async function() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const result = {
            b_actin: urlParams.get('bActin'),
            average: urlParams.get('average'),
            CLDN10: urlParams.get('CLDN10'),
            TIMP3: urlParams.get('TIMP3'),
            MMP8: urlParams.get('MMP8'),
            FLG: urlParams.get('FLG'),
            AQP3: urlParams.get('AQP3'),
            COL10A1: urlParams.get('COL10A1')
        };

        console.log('Received result:', result);

        // Ensure all required data is present
        const requiredParams = ['b_actin', 'average', 'CLDN10', 'TIMP3', 'MMP8', 'FLG', 'AQP3', 'COL10A1'];
        const missingParams = requiredParams.filter(param => !result[param]);
        if (missingParams.length > 0) {
            throw new Error(`다음 필요한 데이터가 누락되었습니다: ${missingParams.join(', ')}`);
        }

        // Parse numerical values
        const bActin = parseFloat(result.b_actin);
        const average = parseFloat(result.average);

        // Validate parsed values
        if (isNaN(bActin) || isNaN(average)) {
            throw new Error('결과에서 유효하지 않은 숫자 값이 반환되었습니다.');
        }

        const values = createValuesArray(result, ['CLDN10', 'TIMP3', 'MMP8', 'FLG', 'AQP3', 'COL10A1'], bActin);
        console.log('Parsed values:', values);

        // Display results and radar chart
        displayResults(values, average);
        displayRadarChart(values);
    } catch (error) {
        console.error('Error processing results:', error);
        const resultsDiv = document.getElementById('results');
        if (resultsDiv) {
            resultsDiv.innerHTML = `<p>결과를 처리하는 동안 문제가 발생했습니다: ${error.message}</p>`;
        }
    }
});

function createValuesArray(result, params, bActin) {
    return params.map(param => {
        const value = parseFloat(result[param]);
        if (isNaN(value)) {
            throw new Error(`'${param}'의 값이 유효한 숫자가 아닙니다.`);
        }
        return {
            name: param,
            value: value,
            result: value - bActin
        };
    });
}

function displayResults(values, average) {
    const resultsDiv = document.getElementById('results');
    if (!resultsDiv) {
        console.error('결과를 표시할 요소를 찾을 수 없습니다.');
        return;
    }
    let resultHTML = '<ul>';

    values.forEach(item => {
        const comparison = item.result > average ? '+' : '-';
        resultHTML += `<li>${item.name.toUpperCase()}: ${item.result.toFixed(2)} (${comparison})</li>`;
    });

    resultHTML += '</ul>';
    resultsDiv.innerHTML = resultHTML;
}

function displayRadarChart(values) {
    const canvas = document.getElementById('radarChart');
    if (!canvas) {
        console.error('차트를 표시할 canvas 요소를 찾을 수 없습니다.');
        return;
    }
    const ctx = canvas.getContext('2d');
    const labels = values.map(item => item.name.toUpperCase());
    const data = values.map(item => item.result);

    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Results',
                data: data,
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                r: {
                    angleLines: {
                        display: true
                    },
                    suggestedMin: Math.min(...data) - 10,
                    suggestedMax: Math.max(...data) + 10
                }
            }
        }
    });
}