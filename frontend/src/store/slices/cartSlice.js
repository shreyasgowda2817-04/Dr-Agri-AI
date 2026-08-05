import { createSlice } from '@reduxjs/toolkit';

// Load initial state from local storage if available to persist cart data
const loadCartFromStorage = () => {
  try {
    const serializedState = localStorage.getItem('agrivision_cart');
    if (serializedState === null) {
      return { items: [], totalAmount: 0, isOpen: false };
    }
    const state = JSON.parse(serializedState);
    // Keep cart closed by default when reloading page
    return { ...state, isOpen: false };
  } catch (err) {
    console.error("Could not load cart from storage", err);
    return { items: [], totalAmount: 0, isOpen: false };
  }
};

const saveCartToStorage = (state) => {
  try {
    // We only save the cart items and total, not the 'isOpen' UI state
    const serializedState = JSON.stringify({
      items: state.items,
      totalAmount: state.totalAmount
    });
    localStorage.setItem('agrivision_cart', serializedState);
  } catch (err) {
    console.error("Could not save cart to storage", err);
  }
};

const initialState = loadCartFromStorage();

const calculateTotal = (items) => {
  return items.reduce((total, item) => total + (item.price * item.quantity), 0);
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem: (state, action) => {
      const product = action.payload;
      const quantity = action.payload.quantity || 1;
      const existingItem = state.items.find(item => item.id === product.id);
      
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        state.items.push({ ...product, quantity });
      }
      state.totalAmount = calculateTotal(state.items);
      state.isOpen = true; // Auto-open cart when item is added
      saveCartToStorage(state); // Persist
    },
    removeItem: (state, action) => {
      const productId = action.payload;
      state.items = state.items.filter(item => item.id !== productId);
      state.totalAmount = calculateTotal(state.items);
      saveCartToStorage(state); // Persist
    },
    updateQuantity: (state, action) => {
      const { id, quantity } = action.payload;
      const item = state.items.find(item => item.id === id);
      if (item && quantity > 0) {
        item.quantity = quantity;
      }
      state.totalAmount = calculateTotal(state.items);
      saveCartToStorage(state); // Persist
    },
    clearCart: (state) => {
      state.items = [];
      state.totalAmount = 0;
      saveCartToStorage(state); // Persist
    },
    toggleCart: (state) => {
      state.isOpen = !state.isOpen;
    },
    openCart: (state) => {
      state.isOpen = true;
    },
    closeCart: (state) => {
      state.isOpen = false;
    }
  }
});

export const { addItem, removeItem, updateQuantity, clearCart, toggleCart, openCart, closeCart } = cartSlice.actions;
export default cartSlice.reducer;
