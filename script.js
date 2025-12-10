// script.js (module)
// Main app logic – uses exports from firebase.js
import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// --- Local Storage Keys (cart kept local) ---
const LS_CART = "bb_cart";

// --- DOM elements (same as before)
const productsEl = document.getElementById("products");
const cartCountEl = document.getElementById("cartCount");
const usernameDisplay = document.getElementById("usernameDisplay");
const userInfoCard = document.getElementById("userInfoCard");
const modalAuth = document.getElementById("modalAuth");
const modalSeller = document.getElementById("modalSeller");
const modalCart = document.getElementById("modalCart");
const userDropdown = document.getElementById("userDropdown");
const userBtn = document.getElementById("userBtn");

// Buttons
document.getElementById("signupBtn").onclick = () => openAuth("signup");
document.getElementById("loginBtn").onclick = () => openAuth("login");
document.getElementById("closeAuth").onclick = () =>
  (modalAuth.style.display = "none");
document.getElementById("openSeller").onclick = () => {
  if (!auth.currentUser) return alert("Please log in first.");
  modalSeller.style.display = "flex";
};
document.getElementById("openSellerAside").onclick = () =>
  document.getElementById("openSeller").click();
document.getElementById("closeSeller").onclick = () =>
  (modalSeller.style.display = "none");
document.getElementById("sellerCancel").onclick = () =>
  (modalSeller.style.display = "none");
document.getElementById("openCart").onclick = () => openCart();
document.getElementById("viewCartAside").onclick = () => openCart();
document.getElementById("clearCartBtn").onclick = () => {
  if (confirm("Clear cart?")) {
    localStorage.setItem(LS_CART, JSON.stringify({}));
    openCart();
    renderCartCount();
  }
};
document.getElementById("closeCart").onclick = () =>
  (modalCart.style.display = "none");
document.getElementById("checkoutBtn").onclick = async () => {
  if (!auth.currentUser) {
    return alert("Please log in to place an order.");
  }

  const cart = loadCart();
  if (Object.keys(cart).length === 0) {
    return alert("Your cart is empty!");
  }

  try {
    // Prepare order items
    const orderItems = [];
    let totalAmount = 0;
    const books = window._books || [];

    for (const bookId in cart) {
      const quantity = cart[bookId];
      const book = books.find((b) => b.id === bookId);
      if (book) {
        const itemTotal = quantity * (book.price || 0);
        totalAmount += itemTotal;
        orderItems.push({
          bookId: bookId,
          bookTitle: book.title,
          bookAuthor: book.author || "Unknown",
          price: book.price || 0,
          quantity: quantity,
          sellerId: book.sellerId,
          sellerName: book.sellerName,
          imageURL: book.imageURL,
        });
      }
    }

    // Create order in Firestore
    await addDoc(collection(db, "orders"), {
      buyerId: auth.currentUser.uid,
      buyerName: auth.currentUser.displayName || auth.currentUser.email,
      buyerEmail: auth.currentUser.email,
      items: orderItems,
      totalAmount: totalAmount,
      status: "pending",
      createdAt: serverTimestamp(),
    });

    alert("Order placed successfully! Check 'My Orders' to track it.");
    localStorage.setItem(LS_CART, JSON.stringify({}));
    renderCartCount();
    modalCart.style.display = "none";
  } catch (err) {
    alert("Failed to place order: " + err.message);
  }
};

document.getElementById("gotoMyBooks").onclick = () => {
  window.location.href = "mybooks.html";
};
document.getElementById("gotoRequests").onclick = () => {
  window.location.href = "requests.html";
};

// helpers
function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(LS_CART)) || {};
  } catch {
    return {};
  }
}
function saveCart(c) {
  localStorage.setItem(LS_CART, JSON.stringify(c));
}
function escapeHtml(s) {
  return s
    ? String(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
    : "";
}

// --- AUTH UI + logic ---
let authMode = "signup";
function openAuth(mode) {
  authMode = mode;
  document.getElementById("authTitle").textContent =
    mode === "signup" ? "Sign Up" : "Log In";
  modalAuth.style.display = "flex";
}
document.getElementById("authForm").onsubmit = async (e) => {
  e.preventDefault();
  const name = document.getElementById("authName").value.trim();
  const email = document.getElementById("authEmail").value.trim();
  const pass = document.getElementById("authPass").value;

  try {
    if (authMode === "signup") {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(cred.user, {
        displayName: name || email.split("@")[0],
      });
      alert("Signed up & logged in.");
    } else {
      await signInWithEmailAndPassword(auth, email, pass);
      alert("Logged in successfully.");
    }
    modalAuth.style.display = "none";
    e.target.reset();
  } catch (err) {
    alert(err.message);
  }
};

// logout
document.getElementById("logoutBtn").onclick = async () => {
  if (!confirm("Do you want to log out?")) return;
  await signOut(auth);
  alert("Logged out successfully.");
};

// react to auth state
onAuthStateChanged(auth, (user) => {
  renderUser(user);
});

// render user UI
function renderUser(user) {
  if (user) {
    usernameDisplay.style.display = "none";
    document.getElementById("signupBtn").style.display = "none";
    document.getElementById("loginBtn").style.display = "none";
    userDropdown.style.display = "block";
    userBtn.textContent = user.displayName || user.email;
    userInfoCard.innerHTML = `<b>${escapeHtml(
      user.displayName || "User"
    )}</b><br>${escapeHtml(user.email)}`;
  } else {
    usernameDisplay.style.display = "block";
    document.getElementById("signupBtn").style.display = "inline-block";
    document.getElementById("loginBtn").style.display = "inline-block";
    userDropdown.style.display = "none";
    usernameDisplay.textContent = "Not signed in";
    userInfoCard.textContent = "Please sign in to see account info.";
  }
}

// Default book cover (fallback)
const defaultBookCover =
  "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&h=600&fit=crop";

// Helper: Convert image file to Base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

// --- ADD BOOK (Firestore with Base64 image) ---
document.getElementById("sellerForm").onsubmit = async (e) => {
  e.preventDefault();
  if (!auth.currentUser) return alert("Please log in");

  const title = document.getElementById("bookTitle").value.trim();
  const author = document.getElementById("bookAuthor").value.trim();
  const price = Number(document.getElementById("bookPrice").value.trim()) || 0;
  const desc = document.getElementById("bookDesc").value.trim();
  const file = document.getElementById("bookImage").files[0];

  let imageURL = defaultBookCover;

  try {
    // Convert image to Base64 if file exists
    if (file) {
      // Check file size (limit to 1MB to avoid Firestore limits)
      if (file.size > 1024 * 1024) {
        alert("Image too large! Please choose an image smaller than 1MB.");
        return;
      }

      // Show loading message
      const submitBtn = e.target.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = "Uploading...";
      submitBtn.disabled = true;

      imageURL = await fileToBase64(file);

      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  } catch (err) {
    console.error("Image conversion failed", err);
    alert("Image processing failed. Using default image.");
  }

  try {
    await addDoc(collection(db, "books"), {
      title,
      author,
      price,
      description: desc,
      sellerName: auth.currentUser.displayName || auth.currentUser.email,
      sellerId: auth.currentUser.uid,
      imageURL,
      available: true,
      createdAt: serverTimestamp(),
    });
    alert("Book added!");
    modalSeller.style.display = "none";
    e.target.reset();
  } catch (err) {
    alert("Failed to add book: " + err.message);
  }
};

// --- LISTEN & RENDER BOOKS (Realtime) ---
const booksCol = collection(db, "books");
const q = query(booksCol, orderBy("createdAt", "desc"));

onSnapshot(q, (snapshot) => {
  const arr = [];
  snapshot.forEach((docSnap) => {
    arr.push({ id: docSnap.id, ...docSnap.data() });
  });
  renderProducts(arr);
});

// render products into DOM
function renderProducts(arr) {
  productsEl.innerHTML = "";
  if (!arr.length)
    return (productsEl.innerHTML =
      '<div class="muted small">No books yet.</div>');

  arr.forEach((p, i) => {
    const d = document.createElement("div");
    d.className = "card product";
    d.innerHTML = `
      <img src="${p.imageURL || defaultBookCover}">
      <div><b>${escapeHtml(
        p.title
      )}</b><br><span class="muted small">${escapeHtml(
      p.author || "Unknown"
    )}</span></div>
      <div style="font-weight:700">TK ${p.price || 0}</div>
      <div style="display:flex;gap:8px">
        <button data-id="${
          p.id
        }" class="btn-primary addCart">Add to Cart</button>
        <button data-id="${p.id}" data-owner="${
      p.sellerId || ""
    }" class="btn-ghost borrowBtn">Request</button>
      </div>
      <div class="small muted">Seller: ${escapeHtml(
        p.sellerName || "Unknown"
      )}</div>
    `;
    productsEl.appendChild(d);
  });
}

// --- Cart functions (local) ---
function renderCartCount() {
  const c = loadCart();
  const count = Object.values(c).reduce((a, b) => a + b, 0);
  cartCountEl.textContent = count;
}
renderCartCount();

// delegate clicks
document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("addCart")) {
    const id = e.target.dataset.id;
    const c = loadCart();
    c[id] = (c[id] || 0) + 1;
    saveCart(c);
    renderCartCount();
    alert("Added to cart");
  }

  if (e.target.classList.contains("borrowBtn")) {
    if (!auth.currentUser) return alert("Please log in to request books.");
    const bookId = e.target.dataset.id;
    const ownerId = e.target.dataset.owner;
    try {
      await addDoc(collection(db, "requests"), {
        bookId,
        ownerId,
        borrowerId: auth.currentUser.uid,
        borrowerName: auth.currentUser.displayName || auth.currentUser.email,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      alert("Borrow request sent!");
    } catch (err) {
      alert("Failed to send request: " + err.message);
    }
  }
});

// keep last books snapshot for helper lookups (used by cart event)
onSnapshot(q, (snapshot) => {
  const arr = [];
  snapshot.forEach((docSnap) =>
    arr.push({ id: docSnap.id, ...docSnap.data() })
  );
  window._books = arr;
});

// --- OPEN CART modal ---
function openCart() {
  modalCart.style.display = "flex";
  const c = loadCart();
  const arr = window._books || [];
  const box = document.getElementById("cartContents");
  box.innerHTML = "";
  let total = 0;
  for (const id in c) {
    const q = c[id];
    const p = arr.find((x) => x.id === id);
    if (!p) continue;
    total += q * (p.price || 0);
    const d = document.createElement("div");
    d.className = "cart-item";
    d.innerHTML = `<img src="${p.imageURL || defaultBookCover}">
      <div style="flex:1">${escapeHtml(p.title)}<br>TK ${
      p.price || 0
    } × ${q}</div>
      <button class="btn-ghost removeCartBtn" data-id="${id}">Remove</button>`;
    box.appendChild(d);
  }
  document.getElementById("cartTotal").textContent = "TK " + total;
}

// remove from cart (delegate)
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("removeCartBtn")) {
    const id = e.target.dataset.id;
    const c = loadCart();
    delete c[id];
    saveCart(c);
    openCart();
    renderCartCount();
  }
});

// initial rendering: nothing to do (onSnapshot will populate)

// --- Utility: delete book by id (used on mybooks page) ---
export async function deleteBookById(bookId) {
  try {
    await deleteDoc(doc(db, "books", bookId));
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

// --- Utility: approve/decline request (used on requests page) ---
export async function updateRequestStatus(requestId, status) {
  try {
    await updateDoc(doc(db, "requests", requestId), { status });
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}
