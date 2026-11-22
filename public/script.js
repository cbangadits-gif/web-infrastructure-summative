let historyRecords = [];
let exchangeRates = null;

const amountInput = document.getElementById('amount');
const categorySelect = document.getElementById('category');
const currencySelect = document.getElementById('currency');
const monthsLateInput = document.getElementById('months-late');
const calcBtn = document.getElementById('calculate-btn');
const errorDiv = document.getElementById('error-message');
const resultDisplay = document.getElementById('result-display');
const historyBody = document.getElementById('history-body');

async function fetchRates() {
    try {
        const response = await  fetch('api/convert');
        if (!response.ok) throw new Error('Server error');
        const data = await response.json();
        exchangeRates = data.rates; 
    } catch (error) {
        console.error("Could not fetch exchange rates:", error);
        errorDiv.textContent = "Exchange rates are unavailable. Amounts in RWF still work.";
    }
}
fetchRates();

calcBtn.addEventListener('click', () => {
    errorDiv.textContent = "";
    const amount = parseFloat(amountInput.value);
    const category = categorySelect.value;
    const currency = currencySelect.value;
    const monthsLate = monthsLateInput.value === "" ? 0 : Number(monthsLateInput.value);

    if (isNaN(amount) || amount <= 0) {
        errorDiv.textContent = "Please enter a valid positive number for the amount.";
        return;
    }
    if (!Number.isInteger(monthsLate) || monthsLate <0) {
        errorDiv.textContent = "Months late must be a whole number (0 or more).";
        return;
    }
    const taxRate = category === 'standard' ? 0.18 : 0;
    const vatDueRwf = amount * taxRate;
    const penaltyRwf = vatDueRwf * 0.03 * monthsLate;
    const totalDueRwf = vatDueRwf + penaltyRwf;
    let foreignEquivalentStr = "N/A";
    if (currency === 'RWF') {
        foreignEquivalentStr = `${vatDueRwf.toFixed(2)} RWF`;
    } else if (exchangeRates && exchangeRates[currency] && exchangeRates['RWF']) {
            const foreignAmount = (vatDueRwf / exchangeRates['RWF']) * exchangeRates[currency];
            foreignEquivalentStr = `${foreignAmount.toFixed(2)} ${currency}`;
    } else {
        errorDiv.textContent = "Exchange rate not available for " + currency + ".";
    }
let penaltyHTML="";
    if(monthsLate > 0) {
        penaltyHTML=`
        <p style="color: red;">Late penalty (${monthsLate} months): <strong>${penaltyRwf.toLocaleString()} RWF</strong></p>
        <p>Total Due (VAT+ Penalty): <strong>${totalDueRwf.toLocaleString()} RWF</strong></p>
        `;
    }
    resultDisplay.innerHTML = `
        <h3>Revenue: ${amount.toLocaleString()} RWF</h3>
        <p>Category: <strong>${category.toUpperCase()}</strong></p>
        <p>VAT Rate: <strong>${taxRate * 100}%</strong></p>
        <p>VAT Due: <strong>${vatDueRwf.toLocaleString()} RWF</strong></p>
        <p>Equivalent in ${currency}: <strong>${foreignEquivalentStr}</strong></p>
        ${penaltyHTML} 
    `;
    const record ={
        date: new Date().toDateString(),
        category: category,
        revenue: amount,
        vat: vatDueRwf,
        penalty: penaltyRwf,
        foreign: foreignEquivalentStr,
    };
    historyRecords.unshift(record);
    renderHistory();
});

function renderHistory() {
    historyBody.innerHTML = "";
    const filter = document.getElementById('filter-category').value;
    const search = document.getElementById('search-input').value.toLowerCase();
    const filteredRecords = historyRecords.filter(record => {
        const matchesCategory = filter === 'all' || record.category === filter;
        const matchesSearch = record.date.toLowerCase().includes(search) || record.revenue.toString().includes(search);
        return matchesCategory && matchesSearch;
    });

    filteredRecords.forEach(record => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${record.date}</td>
            <td>${record.category}</td>
            <td>${record.revenue.toLocaleString()} RWF</td>
            <td>${record.vat.toLocaleString()} RWF</td>
            <td>${record.penalty.toLocaleString()} RWF</td>
            <td>${record.foreign}</td>
        `;
        historyBody.appendChild(row);
    });
}

document.getElementById('filter-category').addEventListener('change', renderHistory);
document.getElementById('search-input').addEventListener('input', renderHistory);



