document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('emi-form');
    const clearBtn = document.getElementById('clear-btn');
    const resultText = document.getElementById('result-text');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculateEMI();
    });

    clearBtn.addEventListener('click', () => {
        form.reset();
        resultText.innerHTML = `Monthly Payment: $0.00`;
    });

    function calculateEMI() {
        const principalStr = document.getElementById('principal').value;
        const monthsStr = document.getElementById('months').value;
        const tenureType = document.getElementById('tenure-type').value;
        const rateStr = document.getElementById('rate').value;
        const emiType = document.getElementById('type').value;

        // Parse inputs
        const P = parseFloat(principalStr);
        let n = parseInt(monthsStr, 10);
        const annualRate = parseFloat(rateStr);

        // Validation
        if (isNaN(P) || isNaN(n) || isNaN(annualRate) || P <= 0 || n <= 0 || annualRate < 0) {
            resultText.innerHTML = "Please enter valid positive numbers.";
            return;
        }

        // Adjust tenure based on type (months vs years)
        if (tenureType === 'years') {
            n = n * 12;
        }

        // Calculate monthly interest rate (r)
        // Rate from user is annual % (e.g., 5.1250) -> convert to decimal and monthly
        const r = (annualRate / 100) / 12;

        let E = 0;

        if (r === 0) {
            // Edge case: 0% interest
            E = P / n;
        } else {
            // Formula calculation
            const temp = Math.pow(1 + r, n);
            E = P * r * (temp / (temp - 1));

            // Adjust for advance payments
            if (emiType === 'advance') {
                E = E / (1 + r);
            }
        }

        // Format and display the result
        resultText.innerHTML = `Monthly Payment: $${E.toFixed(2)}`;
        
        // Add a small animation for feedback
        resultText.style.animation = 'none';
        resultText.offsetHeight; // Trigger reflow
        resultText.style.animation = 'pulse 0.4s ease-in-out';
    }
});
