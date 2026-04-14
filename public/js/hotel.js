document.addEventListener('DOMContentLoaded', () => {
    // Set current date
    const dateElement = document.getElementById('current-date');
    const today = new Date();
    dateElement.textContent = today.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });

    const form = document.getElementById('item-form');
    const select = document.getElementById('item-select');
    const qtyInput = document.getElementById('item-qty');
    const tbody = document.getElementById('bill-body');
    const subtotalEl = document.getElementById('subtotal');
    const gstEl = document.getElementById('gst-amount');
    const grandTotalEl = document.getElementById('grand-total');

    let items = [];
    const GST_RATE = 0.05;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const selectedOption = select.options[select.selectedIndex];
        if (!selectedOption.value) return;

        const name = selectedOption.value;
        const price = parseFloat(selectedOption.dataset.price);
        const qty = parseInt(qtyInput.value, 10);

        if (qty > 0) {
            addItem(name, price, qty);
            // Reset form partly
            qtyInput.value = 1;
            select.selectedIndex = 0;
        }
    });

    function addItem(name, price, qty) {
        // Check if item already exists
        const existingItem = items.find(i => i.name === name);
        if (existingItem) {
            existingItem.qty += qty;
        } else {
            items.push({ name, price, qty });
        }
        
        renderTable();
    }

    function removeItem(index) {
        items.splice(index, 1);
        renderTable();
    }

    // Attach to window so onclick inline or delegated can use it (delegated preferred)
    tbody.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-item')) {
            const index = parseInt(e.target.dataset.index, 10);
            removeItem(index);
        }
    });

    function renderTable() {
        tbody.innerHTML = '';
        let subtotal = 0;

        items.forEach((item, index) => {
            const amount = item.price * item.qty;
            subtotal += amount;

            const tr = document.createElement('tr');
            
            tr.innerHTML = `
                <td>${index + 1}.</td>
                <td>${item.name} <span class="delete-item" title="Remove" data-index="${index}">✖</span></td>
                <td>${item.qty}</td>
                <td>Rs. ${item.price.toFixed(2)} Each</td>
                <td>Rs. ${amount.toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        });

        calculateTotals(subtotal);
    }

    function calculateTotals(subtotal) {
        const gstAmount = subtotal * GST_RATE;
        const grandTotal = subtotal + gstAmount;

        subtotalEl.textContent = `Rs. ${subtotal.toFixed(2)}`;
        gstEl.textContent = `Rs. ${gstAmount.toFixed(2)}`;
        grandTotalEl.textContent = `Rs. ${grandTotal.toFixed(2)}`;
    }
});
