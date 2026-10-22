const CART_KEY = "docraw-cart";
const ORDER_KEY = "docraw-latest-order";
const ORDER_HISTORY_KEY = "docraw-order-history";
const ORDER_RECORDS_KEY = "docraw-orders";
const SELLER_KEY = "docraw-seller";
const SELLER_ACCOUNTS_KEY = "docraw-vendor-accounts";
const SELLER_SESSION_KEY = "docraw-seller-session";
const CUSTOMER_ACCOUNTS_KEY = "docraw-customer-accounts";
const CUSTOMER_SESSION_KEY = "docraw-customer-session";
const VENDOR_PRODUCTS_KEY = "docraw-vendor-products";
const VENDOR_SALES_KEY = "docraw-vendor-sales";
const VENDOR_VOICE_ALERTS_KEY = "docraw-vendor-voice-alerts";
const MAX_PRODUCT_IMAGE_BYTES = 500 * 1024;
const ORDER_STATUSES = ["Order received", "Preparing order", "Out for delivery", "Delivered"];

const products = {
    sportset: {
        id: "sportset",
        name: "Herren Sport Set",
        description: "Black short-sleeve t-shirt and matching training shorts outfit.",
        price: 15000,
        image: "images/sportset.jpg"
    },
    mat: {
        id: "mat",
        name: "Tone Fitness Yoga Mat",
        description: "Rolled teal fitness mat for stability and floor exercise.",
        price: 30000,
        image: "images/mat.jpg"
    },
    jbl: {
        id: "jbl",
        name: "JBL Clip3 Speaker",
        description: "Colorful, circular portable Bluetooth speaker with built-in carabiner.",
        price: 20000,
        image: "images/jbl.jpg"
    },
    amazfit: {
        id: "amazfit",
        name: "Amazfit BipU Pro Watch",
        description: "A green Amazfit Bip U Pro smartwatch with silicone strap.",
        price: 30000,
        image: "images/amazfit.jpg"
    }
};

function getCart() {
    try {
        return JSON.parse(localStorage.getItem(CART_KEY)) || {};
    } catch (error) {
        return {};
    }
}

function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartCount();
}

function formatPrice(price) {
    return `${price.toLocaleString("en-US")} RWF`;
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
    })[character]);
}

function getSeller() {
    try {
        const session = localStorage.getItem(SELLER_SESSION_KEY);
        if (!session) return null;

        const accounts = JSON.parse(localStorage.getItem(SELLER_ACCOUNTS_KEY)) || [];
        if (Array.isArray(accounts)) {
            const activeAccount = accounts.find((account) => account.normalizedName === session);
            if (activeAccount) return activeAccount;
        }

        return session === "signed-in" ? JSON.parse(localStorage.getItem(SELLER_KEY)) || null : null;
    } catch (error) {
        return null;
    }
}

function sellerIsSignedIn() {
    return Boolean(getSeller());
}

function getCustomerAccount() {
    try {
        const accounts = JSON.parse(localStorage.getItem(CUSTOMER_ACCOUNTS_KEY)) || [];
        const activeName = localStorage.getItem(CUSTOMER_SESSION_KEY);
        return Array.isArray(accounts) ? accounts.find((account) => account.normalizedName === activeName) || null : null;
    } catch (error) {
        return null;
    }
}

function getOrderHistory() {
    try {
        const history = JSON.parse(localStorage.getItem(ORDER_HISTORY_KEY)) || [];
        return Array.isArray(history) ? history : [];
    } catch (error) {
        return [];
    }
}

function getOrderRecords() {
    let records;
    try {
        const savedRecords = JSON.parse(localStorage.getItem(ORDER_RECORDS_KEY)) || [];
        records = Array.isArray(savedRecords) ? savedRecords : [];
    } catch (error) {
        records = [];
    }

    const recordsById = new Map(records.map((order) => [order.id, order]));
    const legacyOrders = [...getOrderHistory()];
    try {
        const latestOrder = JSON.parse(localStorage.getItem(ORDER_KEY) || "null");
        if (latestOrder) legacyOrders.push(latestOrder);
    } catch (error) {
        // Ignore an invalid legacy latest-order value; saved order records remain usable.
    }

    let changed = false;
    legacyOrders.forEach((order) => {
        if (order?.id && !recordsById.has(order.id)) {
            records.push(order);
            recordsById.set(order.id, order);
            changed = true;
        }
    });
    if (changed || localStorage.getItem(ORDER_RECORDS_KEY) === null) {
        localStorage.setItem(ORDER_RECORDS_KEY, JSON.stringify(records));
    }
    return records;
}

function getVendorProducts() {
    try {
        const savedProducts = JSON.parse(localStorage.getItem(VENDOR_PRODUCTS_KEY)) || [];
        return Array.isArray(savedProducts) ? savedProducts : [];
    } catch (error) {
        return [];
    }
}

function renderVendorProducts() {
    const savedProducts = getVendorProducts();
    savedProducts.forEach((product) => {
        products[product.id] = product;
    });

    const container = document.querySelector("[data-vendor-products]");
    if (!container) return;

    container.hidden = savedProducts.length === 0;
    const emptyState = document.querySelector("[data-vendor-shop-empty]");
    if (emptyState) emptyState.hidden = savedProducts.length > 0;
    container.replaceChildren();

    savedProducts.forEach((product) => {
        const card = document.createElement("article");
        card.className = "era";

        const image = document.createElement("img");
        image.src = product.image;
        image.alt = product.name;
        const name = document.createElement("h2");
        name.textContent = product.name;
        card.append(image, name);

        const description = document.createElement("p");
        description.className = "description";
        description.textContent = product.description;
        card.append(description);

        const productMeta = document.createElement("div");
        productMeta.className = "vendor-product-meta";
        const shop = document.createElement("p");
        shop.className = "vendor-product-shop";
        shop.textContent = `Sold by ${product.shopName || "KGLMart vendor"}`;
        const stock = document.createElement("span");
        stock.className = "vendor-product-stock";
        const inStock = Number.isFinite(product.stock) && product.stock > 0;
        stock.classList.toggle("is-in-stock", inStock);
        stock.classList.toggle("is-out-of-stock", !inStock);
        stock.textContent = inStock ? "In stock" : "Out of stock";
        stock.setAttribute("role", "status");
        productMeta.append(shop, stock);
        card.append(productMeta);

        const price = document.createElement("p");
        price.textContent = formatPrice(product.price);
        card.append(price);

        const addButton = document.createElement("button");
        addButton.type = "button";
        addButton.className = "btn";
        addButton.dataset.addToCart = product.id;
        addButton.textContent = inStock ? "Add to Cart" : "Out of stock";
        addButton.disabled = !inStock;
        card.append(addButton);
        container.append(card);
    });
}

function renderVendorProfile() {
    const profile = document.querySelector("[data-vendor-profile]");
    if (!profile) return;

    const seller = getSeller();
    const signedOut = document.querySelector("[data-profile-signed-out]");
    if (!seller || !sellerIsSignedIn()) {
        if (signedOut) signedOut.hidden = false;
        profile.hidden = true;
        return;
    }

    if (signedOut) signedOut.hidden = true;
    profile.hidden = false;
    profile.querySelector("[data-profile-name]").textContent = seller.name;
    profile.querySelector("[data-profile-shop]").textContent = seller.shopName;
    profile.querySelector("[data-profile-phone]").textContent = seller.phone;
    profile.querySelector("[data-profile-status]").textContent = "Signed in";
    renderVendorProductsList(seller);
    renderVendorSales(seller);

    const tabList = document.querySelector("[data-vendor-profile-tabs]");
    if (tabList) tabList.hidden = false;
    initializeVendorProfileTabs();
}

function getSellerProducts(seller) {
    return getVendorProducts().filter((product) => product.vendorId === seller.normalizedName);
}

function getVendorSales() {
    try {
        const sales = JSON.parse(localStorage.getItem(VENDOR_SALES_KEY)) || {};
        return sales && typeof sales === "object" && !Array.isArray(sales) ? sales : {};
    } catch (error) {
        return {};
    }
}

function getProductSales(productId) {
    return getVendorSales()[productId] || { quantity: 0, revenue: 0, orderCount: 0 };
}

function getOrderVendorIds(order) {
    return [...new Set(order.items.map((item) => item.vendorId).filter(Boolean))];
}

function getVendorOrderStatus(order, vendorId) {
    return order.vendorStatuses?.[vendorId] || order.status || ORDER_STATUSES[0];
}

function getOrderStatus(order) {
    const vendorIds = getOrderVendorIds(order);
    if (vendorIds.length === 0) return order.status || ORDER_STATUSES[0];
    if (vendorIds.every((vendorId) => getVendorOrderStatus(order, vendorId) === "Delivered")) return "Delivered";
    if (vendorIds.length === 1) return getVendorOrderStatus(order, vendorIds[0]);
    return "In progress";
}

function getOrderById(orderId) {
    if (!orderId) return null;
    return getOrderRecords().find((order) => order.id === orderId) || null;
}

function updateOrderHistory(order) {
    const records = getOrderRecords();
    const recordIndex = records.findIndex((savedOrder) => savedOrder.id === order.id);
    if (recordIndex === -1) return false;
    records[recordIndex] = order;
    localStorage.setItem(ORDER_RECORDS_KEY, JSON.stringify(records));

    const history = getOrderHistory();
    const index = history.findIndex((savedOrder) => savedOrder.id === order.id);
    if (index !== -1) {
        history[index] = order;
        localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(history));
    }
    if (JSON.parse(localStorage.getItem(ORDER_KEY) || "null")?.id === order.id) {
        localStorage.setItem(ORDER_KEY, JSON.stringify(order));
    }
    return true;
}

function advanceVendorOrder(orderId, vendorId) {
    const order = getOrderById(orderId);
    if (!order || !getOrderVendorIds(order).includes(vendorId)) return false;

    const currentStatus = getVendorOrderStatus(order, vendorId);
    const currentIndex = ORDER_STATUSES.indexOf(currentStatus);
    if (currentIndex < 0 || currentIndex >= ORDER_STATUSES.length - 1) return false;

    const nextStatus = ORDER_STATUSES[currentIndex + 1];
    const now = new Date().toISOString();
    order.vendorStatuses = { ...(order.vendorStatuses || {}), [vendorId]: nextStatus };
    order.vendorStatusUpdatedAt = { ...(order.vendorStatusUpdatedAt || {}), [vendorId]: now };
    order.status = getOrderStatus(order);
    order.updatedAt = now;

    if (nextStatus === "Delivered") {
        const completedVendors = new Set(order.completedVendors || []);
        if (!completedVendors.has(vendorId)) {
            const sales = getVendorSales();
            order.items.filter((item) => item.vendorId === vendorId).forEach((item) => {
                const previousSales = sales[item.productId] || { quantity: 0, revenue: 0, orderCount: 0 };
                sales[item.productId] = {
                    quantity: previousSales.quantity + item.quantity,
                    revenue: previousSales.revenue + item.price * item.quantity,
                    orderCount: previousSales.orderCount + 1
                };
            });
            localStorage.setItem(VENDOR_SALES_KEY, JSON.stringify(sales));
            completedVendors.add(vendorId);
            order.completedVendors = [...completedVendors];
        }
    }

    return updateOrderHistory(order);
}

function renderVendorOrderTracking() {
    const list = document.querySelector("[data-vendor-orders-list]");
    if (!list) return;

    const seller = getSeller();
    const emptyState = document.querySelector("[data-vendor-orders-empty]");
    if (!seller) {
        list.replaceChildren();
        emptyState.textContent = "Sign in to view your orders.";
        emptyState.hidden = false;
        return;
    }

    const orders = getOrderRecords().filter((order) => getOrderVendorIds(order).includes(seller.normalizedName));
    emptyState.hidden = orders.length > 0;
    emptyState.textContent = "No customer orders yet. New orders will appear here.";
    list.replaceChildren();

    orders.forEach((order) => {
        const vendorItems = order.items.filter((item) => item.vendorId === seller.normalizedName);
        const status = getVendorOrderStatus(order, seller.normalizedName);
        const article = document.createElement("article");
        article.className = "vendor-order-card";

        const header = document.createElement("div");
        header.className = "vendor-order-card__header";
        const title = document.createElement("h2");
        title.textContent = `Order ${order.id}`;
        const badge = document.createElement("span");
        badge.className = "vendor-order-status";
        badge.textContent = status;
        header.append(title, badge);
        article.append(header);

        const customer = document.createElement("p");
        customer.textContent = `Customer: ${order.customerName}`;
        article.append(customer);
        if (order.customerPhone) {
            const phone = document.createElement("p");
            phone.textContent = `Phone: ${order.customerPhone}`;
            article.append(phone);
        }
        if (order.deliveryAddress) {
            const address = document.createElement("p");
            address.textContent = `Delivery address: ${order.deliveryAddress}`;
            article.append(address);
        }

        const placed = document.createElement("p");
        placed.className = "vendor-order-date";
        placed.textContent = `Placed ${new Intl.DateTimeFormat("en-RW", { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.placedAt))}`;
        article.append(placed);

        const itemList = document.createElement("ul");
        vendorItems.forEach((item) => {
            const line = document.createElement("li");
            line.textContent = `${item.name} x ${item.quantity} — ${formatPrice(item.price * item.quantity)}`;
            itemList.append(line);
        });
        article.append(itemList);

        const nextStatusIndex = ORDER_STATUSES.indexOf(status) + 1;
        if (nextStatusIndex > 0 && nextStatusIndex < ORDER_STATUSES.length) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "vendor-order-action";
            button.dataset.advanceVendorOrder = order.id;
            button.textContent = status === "Order received"
                ? "Accept & prepare order"
                : status === "Preparing order"
                    ? "Mark out for delivery"
                    : "Mark as delivered";
            article.append(button);
        } else {
            const complete = document.createElement("p");
            complete.className = "vendor-order-complete";
            complete.textContent = "You marked this order as delivered.";
            article.append(complete);
        }

        list.append(article);
    });
}

function renderCustomerTracking() {
    const card = document.querySelector("[data-tracking-card]");
    if (!card) return;

    const orderId = new URLSearchParams(window.location.search).get("order");
    let latestOrder = null;
    try {
        latestOrder = JSON.parse(localStorage.getItem(ORDER_KEY) || "null");
    } catch (error) {
        latestOrder = null;
    }
    const order = getOrderById(orderId) || getOrderById(latestOrder?.id);
    const emptyState = document.querySelector("[data-no-order]");
    if (!order) {
        card.hidden = true;
        emptyState.hidden = false;
        return;
    }

    emptyState.hidden = true;
    card.hidden = false;
    const vendorIds = getOrderVendorIds(order);
    const status = getOrderStatus(order);
    document.querySelector("[data-track-order-id]").textContent = order.id;
    const statusBadge = document.querySelector("[data-track-status]");
    statusBadge.textContent = status;
    statusBadge.classList.toggle("is-delivered", status === "Delivered");
    statusBadge.classList.toggle("is-pending", status !== "Delivered");
    const cartLink = document.querySelector("[data-tracking-cart-link]");
    if (cartLink) {
        cartLink.href = "cart.html?tab=processing";
        cartLink.hidden = status === "Delivered";
    }
    document.querySelector("[data-track-date]").textContent = new Intl.DateTimeFormat("en-RW", { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.placedAt));
    document.querySelector("[data-track-total]").textContent = `${order.total.toLocaleString("en-US")} RWF`;

    const itemList = document.querySelector("[data-track-items]");
    itemList.replaceChildren();
    order.items.forEach((item) => {
        const row = document.createElement("div");
        const name = document.createElement("span");
        name.textContent = `${item.name} x ${item.quantity}`;
        const price = document.createElement("strong");
        price.textContent = formatPrice(item.price * item.quantity);
        row.append(name, price);
        itemList.append(row);
    });

    const steps = document.querySelectorAll(".tracking-steps li");
    const statuses = vendorIds.length
        ? vendorIds.map((vendorId) => getVendorOrderStatus(order, vendorId))
        : [order.status || ORDER_STATUSES[0]];
    const progressIndex = Math.min(...statuses.map((itemStatus) => Math.max(0, ORDER_STATUSES.indexOf(itemStatus))));
    steps.forEach((step, index) => step.classList.toggle("is-complete", index <= progressIndex));

    const shopStatuses = document.querySelector("[data-tracking-vendor-statuses]");
    if (shopStatuses) {
        shopStatuses.replaceChildren();
        [...new Set(order.items.filter((item) => item.vendorId).map((item) => item.vendorId))].forEach((vendorId) => {
            const shopName = order.items.find((item) => item.vendorId === vendorId)?.shopName || "Vendor";
            const line = document.createElement("p");
            line.textContent = `${shopName}: ${getVendorOrderStatus(order, vendorId)}`;
            shopStatuses.append(line);
        });
        shopStatuses.hidden = shopStatuses.childElementCount === 0;
    }
}

function announceVendorOrder(order, seller) {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    const items = order.items.filter((item) => item.vendorId === seller.normalizedName);
    const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const utterance = new SpeechSynthesisUtterance(`New KGLMart order ${order.id}. ${quantity} item${quantity === 1 ? "" : "s"} for ${seller.shopName}. Please open order tracking.`);
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
}

function getVendorNotificationKey(seller) {
    return `docraw-vendor-pending-notifications-${encodeURIComponent(seller.normalizedName)}`;
}

function getAcknowledgedVendorOrdersKey(seller) {
    return `docraw-vendor-acknowledged-orders-${encodeURIComponent(seller.normalizedName)}`;
}

function getPendingVendorNotifications(seller) {
    try {
        const notifications = JSON.parse(localStorage.getItem(getVendorNotificationKey(seller)) || "[]");
        return Array.isArray(notifications) ? notifications.filter((orderId) => typeof orderId === "string") : [];
    } catch (error) {
        return [];
    }
}

function getAcknowledgedVendorOrders(seller) {
    try {
        const orderIds = JSON.parse(localStorage.getItem(getAcknowledgedVendorOrdersKey(seller)) || "[]");
        return Array.isArray(orderIds) ? orderIds.filter((orderId) => typeof orderId === "string") : [];
    } catch (error) {
        return [];
    }
}

function savePendingVendorNotifications(seller, notifications) {
    localStorage.setItem(getVendorNotificationKey(seller), JSON.stringify(notifications));
}

function acknowledgeVendorOrderNotification(seller, orderId) {
    const acknowledged = new Set(getAcknowledgedVendorOrders(seller));
    acknowledged.add(orderId);
    localStorage.setItem(getAcknowledgedVendorOrdersKey(seller), JSON.stringify([...acknowledged]));
    savePendingVendorNotifications(
        seller,
        getPendingVendorNotifications(seller).filter((pendingId) => pendingId !== orderId)
    );
}

function renderVendorNotification(seller, container, orderId) {
    const order = getOrderById(orderId);
    if (!order || getVendorOrderStatus(order, seller.normalizedName) !== "Order received") return false;

    const itemCount = order.items
        .filter((item) => item.vendorId === seller.normalizedName)
        .reduce((total, item) => total + item.quantity, 0);
    const notification = document.createElement("aside");
    notification.className = "vendor-order-notification";
    notification.setAttribute("aria-label", `New order ${order.id}`);

    const copy = document.createElement("div");
    copy.className = "vendor-order-notification__copy";
    const title = document.createElement("strong");
    title.textContent = "New customer order";
    const details = document.createElement("span");
    details.textContent = `Order ${order.id} · ${itemCount} item${itemCount === 1 ? "" : "s"}`;
    copy.append(title, details);

    const actions = document.createElement("div");
    actions.className = "vendor-order-notification__actions";
    const viewButton = document.createElement("a");
    viewButton.className = "vendor-order-notification__view";
    const trackingPage = window.location.pathname.toLocaleLowerCase().includes("/vendor/")
        ? "order-tracking.html"
        : "Vendor/order-tracking.html";
    viewButton.href = `${trackingPage}?order=${encodeURIComponent(order.id)}`;
    viewButton.textContent = "View order";
    viewButton.addEventListener("click", () => {
        acknowledgeVendorOrderNotification(seller, order.id);
    });

    const dismissButton = document.createElement("button");
    dismissButton.type = "button";
    dismissButton.className = "vendor-order-notification__dismiss";
    dismissButton.textContent = "Dismiss";
    dismissButton.setAttribute("aria-label", `Dismiss notification for order ${order.id}`);
    dismissButton.addEventListener("click", () => {
        acknowledgeVendorOrderNotification(seller, order.id);
        notification.remove();
    });

    actions.append(viewButton, dismissButton);
    notification.append(copy, actions);
    container.append(notification);
    return true;
}

function initializeVendorNotifications() {
    if (!window.location.pathname.toLocaleLowerCase().includes("/vendor/")) return;

    const seller = getSeller();
    if (!seller) return;

    let container = document.querySelector("[data-vendor-notifications]");
    if (!container) {
        container = document.createElement("section");
        container.className = "vendor-order-notifications";
        container.dataset.vendorNotifications = "";
        container.setAttribute("aria-label", "Vendor order notifications");
        container.setAttribute("aria-live", "polite");
        document.body.append(container);
    }

    const notified = new Set(getPendingVendorNotifications(seller));
    const scanForOrders = (announceNewOrders) => {
        const records = getOrderRecords();
        const acknowledged = new Set(getAcknowledgedVendorOrders(seller));
        const currentPending = new Set();

        records.forEach((order) => {
            if (!getOrderVendorIds(order).includes(seller.normalizedName)
                || getVendorOrderStatus(order, seller.normalizedName) !== "Order received"
                || acknowledged.has(order.id)) {
                return;
            }

            currentPending.add(order.id);
            if (!notified.has(order.id)) {
                notified.add(order.id);
                if (announceNewOrders && localStorage.getItem(VENDOR_VOICE_ALERTS_KEY) === "enabled") {
                    announceVendorOrder(order, seller);
                }
            }
        });

        savePendingVendorNotifications(seller, [...currentPending]);
        container.replaceChildren();
        [...currentPending].forEach((orderId) => renderVendorNotification(seller, container, orderId));
    };

    scanForOrders(false);
    window.addEventListener("storage", (event) => {
        if (event.key === ORDER_RECORDS_KEY || event.key === ORDER_KEY) scanForOrders(true);
    });
    window.setInterval(() => scanForOrders(true), 2500);
}

function initializeVendorOrderTracking() {
    const list = document.querySelector("[data-vendor-orders-list]");
    if (!list) return;
    const seller = getSeller();
    const voiceButton = document.querySelector("[data-enable-order-voice]");
    const voiceMessage = document.querySelector("[data-order-voice-message]");

    if (voiceButton) {
        voiceButton.disabled = !window.speechSynthesis || !window.SpeechSynthesisUtterance;
        if (localStorage.getItem(VENDOR_VOICE_ALERTS_KEY) === "enabled") {
            voiceButton.textContent = "Spoken alerts enabled";
        }
        voiceButton.addEventListener("click", () => {
            if (!window.speechSynthesis || !window.SpeechSynthesisUtterance || !seller) {
                voiceMessage.textContent = "Spoken order alerts are not available in this browser.";
                voiceMessage.hidden = false;
                return;
            }
            localStorage.setItem(VENDOR_VOICE_ALERTS_KEY, "enabled");
            voiceButton.textContent = "Spoken alerts enabled";
            voiceMessage.textContent = "Spoken alerts are enabled on all pages while you are signed in as a vendor.";
            voiceMessage.hidden = false;
            window.speechSynthesis.speak(new SpeechSynthesisUtterance("Spoken order alerts enabled."));
        });
    }

    list.addEventListener("click", (event) => {
        const button = event.target.closest("[data-advance-vendor-order]");
        if (!button || !seller) return;
        try {
            if (advanceVendorOrder(button.dataset.advanceVendorOrder, seller.normalizedName)) {
                renderVendorOrderTracking();
                renderVendorProfile();
            }
        } catch (error) {
            const message = document.querySelector("[data-vendor-orders-message]");
            message.textContent = "Could not update the order. Check browser storage and try again.";
            message.hidden = false;
        }
    });

    renderVendorOrderTracking();
    window.addEventListener("storage", (event) => {
        if (event.key === ORDER_RECORDS_KEY && seller) renderVendorOrderTracking();
    });
}

function renderVendorProductsList(seller) {
    const list = document.querySelector("[data-vendor-products-list]");
    if (!list) return;

    const productsForSeller = getSellerProducts(seller);
    const emptyState = document.querySelector("[data-vendor-products-empty]");
    emptyState.hidden = productsForSeller.length > 0;
    list.replaceChildren();

    productsForSeller.forEach((product) => {
        const card = document.createElement("article");
        card.className = "vendor-product-card";

        const image = document.createElement("img");
        image.src = product.image;
        image.alt = product.name;

        const details = document.createElement("div");
        details.className = "vendor-product-card__details";
        const name = document.createElement("h3");
        name.textContent = product.name;
        const description = document.createElement("p");
        description.textContent = product.description;
        const price = document.createElement("strong");
        price.textContent = formatPrice(product.price);
        const stock = document.createElement("p");
        stock.textContent = `Stock: ${product.stock}`;
        const sales = getProductSales(product.id);
        const sold = document.createElement("p");
        sold.textContent = `Sold: ${sales.quantity}`;
        details.append(name, description, price, stock, sold);
        card.append(image, details);
        list.append(card);
    });
}

function renderVendorSales(seller) {
    const emptyState = document.querySelector("[data-vendor-sales-empty]");
    const list = document.querySelector("[data-vendor-sales-list]");
    if (!list || !emptyState) return;

    const sales = getVendorSales();
    const rows = getSellerProducts(seller).map((product) => ({
        product,
        summary: sales[product.id] || { quantity: 0, revenue: 0, orderCount: 0 }
    }));
    const totalUnits = rows.reduce((total, row) => total + row.summary.quantity, 0);
    const totalRevenue = rows.reduce((total, row) => total + row.summary.revenue, 0);
    const totalOrders = getOrderHistory().filter((order) =>
        getOrderVendorIds(order).includes(seller.normalizedName)
        && getVendorOrderStatus(order, seller.normalizedName) === "Delivered"
    ).length;

    document.querySelector("[data-vendor-sales-units]").textContent = String(totalUnits);
    document.querySelector("[data-vendor-sales-revenue]").textContent = formatPrice(totalRevenue);
    document.querySelector("[data-vendor-sales-orders]").textContent = String(totalOrders);
    emptyState.hidden = totalUnits > 0;
    list.replaceChildren();

    rows.forEach(({ product, summary }) => {
        const row = document.createElement("tr");
        [product.name, String(summary.quantity), String(summary.orderCount), formatPrice(summary.revenue)].forEach((value) => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.append(cell);
        });
        list.append(row);
    });
}

function initializeVendorProfileTabs() {
    const tabs = document.querySelectorAll("[data-vendor-profile-tab]");
    const views = document.querySelectorAll("[data-vendor-profile-view]");
    if (!tabs.length || tabs[0].dataset.initialized === "true") return;

    const selectTab = (selectedTab) => {
        tabs.forEach((tab) => {
            const isSelected = tab === selectedTab;
            tab.classList.toggle("is-active", isSelected);
            tab.setAttribute("aria-selected", String(isSelected));
        });
        views.forEach((view) => {
            view.hidden = view.dataset.vendorProfileView !== selectedTab.dataset.vendorProfileTab;
        });
    };

    tabs.forEach((tab) => {
        tab.dataset.initialized = "true";
        tab.addEventListener("click", () => selectTab(tab));
    });
    selectTab(tabs[0]);
}

function readProductImage(file) {
    return new Promise((resolve, reject) => {
        if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            reject(new Error("Choose a JPG, PNG, or WebP image."));
            return;
        }
        if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
            reject(new Error("Choose an image smaller than 500 KB."));
            return;
        }

        const reader = new FileReader();
        reader.addEventListener("load", () => {
            if (typeof reader.result === "string") {
                resolve(reader.result);
            } else {
                reject(new Error("The selected image could not be read."));
            }
        });
        reader.addEventListener("error", () => reject(new Error("The selected image could not be read.")));
        reader.readAsDataURL(file);
    });
}

function saveVendorProduct(form) {
    const seller = getSeller();
    if (!seller) throw new Error("Sign in to publish a product.");

    const formData = new FormData(form);
    const name = String(formData.get("name")).trim();
    const description = String(formData.get("description")).trim();
    const price = Number(formData.get("price"));
    const stock = Number(formData.get("stock"));
    const imageFile = formData.get("image");

    if (!name || !description || !Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) {
        throw new Error("Enter a product name and description, a price greater than zero, and a whole-number stock of zero or more.");
    }
    if (!(imageFile instanceof File) || imageFile.size === 0) {
        throw new Error("Choose a product image to publish.");
    }

    return readProductImage(imageFile).then((image) => {
        const savedProducts = getVendorProducts();
        const id = `vendor-${Date.now()}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`;
        const product = {
            id,
            name,
            description,
            price,
            stock,
            image,
            vendorId: seller.normalizedName,
            shopName: seller.shopName
        };
        savedProducts.unshift(product);
        localStorage.setItem(VENDOR_PRODUCTS_KEY, JSON.stringify(savedProducts));
        products[id] = product;
        return product;
    });
}

function renderVendorProductsPage() {
    const form = document.querySelector("[data-vendor-product-form]");
    if (!form) return;

    const message = document.querySelector("[data-vendor-product-message]");
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        message.hidden = true;
        if (!form.reportValidity()) return;

        try {
            await saveVendorProduct(form);
            form.reset();
            message.textContent = "Product published. Customers can now see it in the shop.";
            message.classList.remove("is-error");
            message.hidden = false;
        } catch (error) {
            message.textContent = error.message || "The product could not be published. Check available browser storage and try again.";
            message.classList.add("is-error");
            message.hidden = false;
        }
    });
}

function renderCustomerProfile() {
    const profile = document.querySelector("[data-customer-profile]");
    if (!profile) return;

    const account = getCustomerAccount();
    const profileTabs = document.querySelector("[data-profile-tabs]");
    profile.hidden = !account;
    if (profileTabs) profileTabs.hidden = !account;
    const signedOut = document.querySelector("[data-profile-signed-out]");
    if (account && signedOut) signedOut.hidden = true;
    if (!account) return;

    profile.querySelector("[data-customer-name]").textContent = account.name;
    profile.querySelector("[data-customer-phone]").textContent = account.phone;

    const location = account.location || {};
    profile.querySelector("[data-customer-location]").textContent = location.address || "Selected on map";
    const hasCoordinates = Number.isFinite(location.latitude) && Number.isFinite(location.longitude);
    const coordinatesRow = profile.querySelector("[data-customer-coordinates-row]");
    const mapLink = profile.querySelector("[data-customer-map-link]");
    coordinatesRow.hidden = !hasCoordinates;
    mapLink.hidden = !hasCoordinates;
    if (hasCoordinates) {
        profile.querySelector("[data-customer-coordinates]").textContent = `${location.latitude}, ${location.longitude}`;
        mapLink.href = `https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=16/${location.latitude}/${location.longitude}`;
    }

    renderCustomerOrderHistory(account.normalizedName);
}

function renderCustomerOrderHistory(customerId) {
    const section = document.querySelector("[data-order-history]");
    if (!section) return;

    const orders = getOrderHistory().filter((order) => order.customerId === customerId);
    const emptyState = section.querySelector("[data-order-history-empty]");
    const list = section.querySelector("[data-order-history-list]");
    const clearButton = section.querySelector("[data-clear-order-history]");
    section.hidden = false;
    emptyState.hidden = orders.length > 0;
    clearButton.disabled = orders.length === 0;
    list.replaceChildren();

    orders.forEach((order) => {
        const article = document.createElement("article");
        article.className = "profile-order";

        const heading = document.createElement("div");
        heading.className = "profile-order-heading";
        const title = document.createElement("h3");
        title.textContent = `Order ${order.id}`;
        const status = document.createElement("span");
        status.textContent = order.status;
        heading.append(title, status);
        article.append(heading);

        const date = document.createElement("p");
        date.className = "profile-order-date";
        date.textContent = new Intl.DateTimeFormat("en-RW", {
            dateStyle: "medium",
            timeStyle: "short"
        }).format(new Date(order.placedAt));
        article.append(date);

        const itemList = document.createElement("ul");
        order.items.forEach((item) => {
            const listItem = document.createElement("li");
            listItem.textContent = `${item.name} x ${item.quantity}`;
            itemList.append(listItem);
        });
        article.append(itemList);

        const total = document.createElement("p");
        total.className = "profile-order-total";
        total.textContent = `Total: ${formatPrice(order.total)}`;
        article.append(total);
        list.append(article);
    });
}

function clearCustomerOrderHistory(customerId) {
    const remainingOrders = getOrderHistory().filter((order) => order.customerId !== customerId);
    localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(remainingOrders));
    renderCustomerOrderHistory(customerId);
}

function initializeProfileTabs() {
    const tabs = document.querySelectorAll("[data-profile-tab]");
    const tabList = document.querySelector("[data-profile-tabs]");
    if (!tabs.length || !tabList || tabList.hidden) return;

    const selectTab = (selectedTab) => {
        tabs.forEach((tab) => {
            const isSelected = tab === selectedTab;
            tab.classList.toggle("is-active", isSelected);
            tab.setAttribute("aria-selected", String(isSelected));
        });
        document.querySelectorAll("[data-profile-view]").forEach((view) => {
            view.hidden = view.dataset.profileView !== selectedTab.dataset.profileTab;
        });
    };

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => selectTab(tab));
    });
    selectTab(tabs[0]);
}

function createOrder(form) {
    const items = cartItems();
    if (items.length === 0) throw new Error("Your cart is empty.");

    const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const vendorIds = [...new Set(items.map(({ product }) => product.vendorId).filter(Boolean))];
    const placedAt = new Date().toISOString();
    const order = {
        id: `DR-${Date.now().toString().slice(-8)}`,
        placedAt,
        customerId: localStorage.getItem(CUSTOMER_SESSION_KEY),
        customerName: form.elements.name.value,
        customerEmail: form.elements.email.value,
        customerPhone: form.elements.phone.value,
        deliveryAddress: form.elements.address.value,
        paymentMethod: form.elements.payment.value,
        items: items.map(({ product, quantity }) => ({
            productId: product.id,
            name: product.name,
            quantity,
            price: product.price,
            vendorId: product.vendorId || null,
            shopName: product.shopName || null
        })),
        total,
        status: "Order received",
        vendorStatuses: Object.fromEntries(vendorIds.map((vendorId) => [vendorId, "Order received"])),
        vendorStatusUpdatedAt: Object.fromEntries(vendorIds.map((vendorId) => [vendorId, placedAt])),
        completedVendors: []
    };

    const savedProducts = getVendorProducts();
    items.forEach(({ product, quantity }) => {
        if (!product.vendorId) return;
        const savedProduct = savedProducts.find((item) => item.id === product.id);
        if (savedProduct) savedProduct.stock = Math.max(0, savedProduct.stock - quantity);
    });

    const orderRecords = getOrderRecords();
    orderRecords.unshift(order);
    localStorage.setItem(VENDOR_PRODUCTS_KEY, JSON.stringify(savedProducts));
    localStorage.setItem(ORDER_KEY, JSON.stringify(order));
    localStorage.setItem(ORDER_RECORDS_KEY, JSON.stringify(orderRecords));
    const orderHistory = getOrderHistory();
    orderHistory.unshift(order);
    localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(orderHistory.slice(0, 50)));
    return order;
}

function addToCart(productId) {
    const product = products[productId];
    if (!product) return;

    const cart = getCart();
    const currentQuantity = cart[productId] || 0;
    if (Number.isInteger(product.stock) && currentQuantity >= product.stock) {
        const message = document.querySelector("[data-cart-message]");
        if (message) {
            const messageText = message.querySelector("[data-cart-message-text]");
            if (messageText) messageText.textContent = product.stock === 0 ? `${product.name} is out of stock.` : `Only ${product.stock} available for ${product.name}.`;
            message.hidden = false;
            message.classList.add("is-visible");
        }
        return;
    }

    cart[productId] = currentQuantity + 1;
    saveCart(cart);

    const message = document.querySelector("[data-cart-message]");
    if (message) {
        const messageText = message.querySelector("[data-cart-message-text]");
        if (messageText) messageText.textContent = `${product.name} added to your cart.`;
        message.hidden = false;
        message.classList.add("is-visible");
    }
}

function updateQuantity(productId, quantity) {
    const cart = getCart();
    const parsedQuantity = Math.max(0, Number.parseInt(quantity, 10) || 0);
    const product = products[productId];
    const availableStock = product && Number.isInteger(product.stock) ? product.stock : parsedQuantity;
    const finalQuantity = Math.min(parsedQuantity, availableStock);

    if (finalQuantity === 0) {
        delete cart[productId];
    } else {
        cart[productId] = finalQuantity;
    }
    saveCart(cart);
    renderCart();
}

function cartItems() {
    const cart = getCart();
    return Object.entries(cart)
        .filter(([productId, quantity]) => products[productId] && quantity > 0)
        .map(([productId, quantity]) => ({ product: products[productId], quantity }));
}

function updateCartCount() {
    const count = Object.values(getCart()).reduce((total, quantity) => total + quantity, 0);
    document.querySelectorAll("[data-cart-count]").forEach((element) => {
        element.textContent = count;
        element.hidden = count === 0;
    });
}

function renderCart() {
    const container = document.querySelector("[data-cart-items]");
    if (!container) return;

    const items = cartItems();
    const emptyState = document.querySelector("[data-empty-cart]");
    const cartLayout = document.querySelector("[data-cart-layout]");

    if (emptyState) emptyState.hidden = items.length > 0;
    if (cartLayout) cartLayout.hidden = items.length === 0;
    if (items.length === 0) return;

    container.innerHTML = items.map(({ product, quantity }) => `
        <article class="cart-item">
            <img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}">
            <div class="cart-item__details">
                <h2>${escapeHTML(product.name)}</h2>
                <p>${escapeHTML(product.description)}</p>
                <strong>${formatPrice(product.price)}</strong>
            </div>
            <label class="quantity-control">Quantity
                <input type="number" min="0" ${Number.isInteger(product.stock) ? `max="${product.stock}"` : ""} value="${quantity}" data-quantity="${escapeHTML(product.id)}" aria-label="Quantity for ${escapeHTML(product.name)}">
            </label>
            <strong class="cart-item__total">${formatPrice(product.price * quantity)}</strong>
            <button class="text-button" type="button" data-remove="${escapeHTML(product.id)}">Remove</button>
        </article>
    `).join("");

    const subtotal = items.reduce((total, item) => total + item.product.price * item.quantity, 0);
    const subtotalElement = document.querySelector("[data-subtotal]");
    if (subtotalElement) subtotalElement.textContent = formatPrice(subtotal);
}

function renderProcessingOrders() {
    const list = document.querySelector("[data-processing-orders-list]");
    if (!list) return;

    const currentCustomerId = localStorage.getItem(CUSTOMER_SESSION_KEY);
    const orders = getOrderRecords()
        .filter((order) => order.customerId === currentCustomerId && getOrderStatus(order) !== "Delivered")
        .sort((first, second) => new Date(second.placedAt) - new Date(first.placedAt));
    const emptyState = document.querySelector("[data-processing-orders-empty]");
    const count = document.querySelector("[data-processing-order-count]");
    if (emptyState) emptyState.hidden = orders.length > 0;
    if (count) count.textContent = String(orders.length);
    list.replaceChildren();

    orders.forEach((order) => {
        const card = document.createElement("a");
        card.className = "processing-order-card";
        card.href = `track-order.html?order=${encodeURIComponent(order.id)}`;

        const heading = document.createElement("div");
        heading.className = "processing-order-card__heading";
        const title = document.createElement("h2");
        title.textContent = `Order ${order.id}`;
        const status = document.createElement("span");
        status.className = "processing-order-card__status";
        status.textContent = getOrderStatus(order);
        heading.append(title, status);

        const items = document.createElement("p");
        items.className = "processing-order-card__items";
        items.textContent = order.items.map((item) => `${item.name} x ${item.quantity}`).join(", ");

        const date = document.createElement("p");
        date.className = "processing-order-card__date";
        date.textContent = `Placed ${new Intl.DateTimeFormat("en-RW", {
            dateStyle: "medium",
            timeStyle: "short"
        }).format(new Date(order.placedAt))}`;

        card.append(heading, items, date);
        list.append(card);
    });
}

function initializeCartTabs() {
    const tabs = document.querySelectorAll("[data-cart-tab]");
    const tabList = document.querySelector(".cart-subnav");
    if (!tabs.length || !tabList) return;

    const selectTab = (selectedTab) => {
        tabs.forEach((tab) => {
            const isSelected = tab === selectedTab;
            tab.classList.toggle("is-active", isSelected);
            tab.setAttribute("aria-selected", String(isSelected));
        });
        document.querySelectorAll("[data-cart-view]").forEach((view) => {
            view.hidden = view.dataset.cartView !== selectedTab.dataset.cartTab;
        });
        const description = document.querySelector("[data-cart-view-description]");
        if (description) {
            description.textContent = selectedTab.dataset.cartTab === "processing"
                ? "View orders that are still on their way."
                : "Check your items and quantities before checkout.";
        }
    };

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => selectTab(tab));
    });
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    selectTab(requestedTab === "processing" ? tabs[1] : tabs[0]);
}

function renderCheckout() {
    const summary = document.querySelector("[data-checkout-summary]");
    if (!summary) return;

    const items = cartItems();
    const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    summary.innerHTML = items.length ? items.map(({ product, quantity }) => `
        <div class="summary-row"><span>${escapeHTML(product.name)} x ${quantity}</span><strong>${formatPrice(product.price * quantity)}</strong></div>
    `).join("") + `<div class="summary-total"><span>Total</span><strong>${formatPrice(total)}</strong></div>` : "<p>Your cart is empty.</p>";

    const form = document.querySelector("[data-checkout-form]");
    if (form) {
        form.hidden = items.length === 0;
        document.querySelector("[data-empty-checkout]").hidden = items.length > 0;

        const customer = getCustomerAccount();
        if (customer) {
            if (!form.elements.name.value) form.elements.name.value = customer.name;
            if (!form.elements.phone.value) form.elements.phone.value = customer.phone;

            const location = customer.location || {};
            const hasCoordinates = Number.isFinite(location.latitude) && Number.isFinite(location.longitude);
            const savedAddress = hasCoordinates ? `Map pin: ${location.latitude}, ${location.longitude}` : location.address || "";
            if (!form.elements.address.value) form.elements.address.value = savedAddress;
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    if (document.querySelector("[data-vendor-protected]") && !sellerIsSignedIn()) {
        window.location.replace("vendor-login.html");
        return;
    }

    renderVendorProducts();
    updateCartCount();
    renderCart();
    renderProcessingOrders();
    initializeCartTabs();
    renderCheckout();
    renderVendorProfile();
    renderCustomerProfile();
    initializeProfileTabs();
    renderVendorProductsPage();
    initializeVendorNotifications();

    const logoutButton = document.querySelector("[data-vendor-logout]");
    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            localStorage.removeItem(SELLER_SESSION_KEY);
            if (document.querySelector("[data-vendor-dashboard], [data-vendor-profile-page]")) {
                window.location.replace("vendor-login.html");
                return;
            }
            renderVendorProfile();
        });
    }

    const customerLogoutButton = document.querySelector("[data-customer-logout]");
    if (customerLogoutButton) {
        customerLogoutButton.addEventListener("click", () => {
            localStorage.removeItem(CUSTOMER_SESSION_KEY);
            window.location.href = "index.html";
        });
    }

    const clearOrderHistoryButton = document.querySelector("[data-clear-order-history]");
    if (clearOrderHistoryButton) {
        clearOrderHistoryButton.addEventListener("click", () => {
            const account = getCustomerAccount();
            if (!account || !window.confirm("Clear your purchase history? This cannot be undone.")) return;

            try {
                clearCustomerOrderHistory(account.normalizedName);
            } catch (error) {
                window.alert("Your purchase history could not be cleared. Please try again.");
            }
        });
    }

    document.addEventListener("click", (event) => {
        const addButton = event.target.closest("[data-add-to-cart]");
        const removeButton = event.target.closest("[data-remove]");
        if (addButton) addToCart(addButton.dataset.addToCart);
        if (removeButton) updateQuantity(removeButton.dataset.remove, 0);
    });

    document.addEventListener("change", (event) => {
        if (event.target.matches("[data-quantity]")) {
            updateQuantity(event.target.dataset.quantity, event.target.value);
        }
    });

    const form = document.querySelector("[data-checkout-form]");
    if (form) {
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            try {
                const order = createOrder(form);
                localStorage.removeItem(CART_KEY);
                window.location.href = `track-order.html?order=${encodeURIComponent(order.id)}`;
            } catch (error) {
                const message = document.querySelector("[data-checkout-message]");
                if (message) {
                    message.textContent = error.message || "Your order could not be placed. Please try again.";
                    message.hidden = false;
                }
            }
        });
    }

    renderCustomerTracking();
    initializeVendorOrderTracking();
    window.addEventListener("storage", (event) => {
        if (event.key === ORDER_RECORDS_KEY || event.key === ORDER_KEY) {
            renderCustomerTracking();
            renderProcessingOrders();
        }
    });
});