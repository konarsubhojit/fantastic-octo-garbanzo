import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { Wishlist } from '@/lib/types';
import type { RootState } from '@/lib/store';

interface WishlistState {
  wishlist: Wishlist | null;
  loading: boolean;
  error: string | null;
}

const initialState: WishlistState = {
  wishlist: null,
  loading: false,
  error: null,
};

export const fetchWishlist = createAsyncThunk(
  'wishlist/fetchWishlist',
  async () => {
    const res = await fetch('/api/wishlist');
    const data = await res.json();
    return data.data?.wishlist as Wishlist | null;
  }
);

export const addToWishlist = createAsyncThunk(
  'wishlist/addToWishlist',
  async (productId: string, { rejectWithValue }) => {
    const res = await fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId }),
    });

    if (!res.ok) {
      const data = await res.json();
      return rejectWithValue(data.error || 'Failed to add to wishlist');
    }

    const data = await res.json();
    return data.data?.wishlist as Wishlist;
  }
);

export const removeFromWishlist = createAsyncThunk(
  'wishlist/removeFromWishlist',
  async (productId: string, { rejectWithValue }) => {
    const res = await fetch(`/api/wishlist/${productId}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const data = await res.json();
      return rejectWithValue(data.error || 'Failed to remove from wishlist');
    }

    const data = await res.json();
    return data.data?.wishlist as Wishlist | null;
  }
);

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    clearWishlist(state) {
      state.wishlist = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // fetchWishlist
    builder
      .addCase(fetchWishlist.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWishlist.fulfilled, (state, action) => {
        state.loading = false;
        state.wishlist = action.payload;
      })
      .addCase(fetchWishlist.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch wishlist';
      });

    // addToWishlist
    builder
      .addCase(addToWishlist.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addToWishlist.fulfilled, (state, action) => {
        state.loading = false;
        state.wishlist = action.payload;
        state.error = null;
      })
      .addCase(addToWishlist.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to add to wishlist';
      });

    // removeFromWishlist
    builder
      .addCase(removeFromWishlist.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeFromWishlist.fulfilled, (state, action) => {
        state.loading = false;
        state.wishlist = action.payload;
        state.error = null;
      })
      .addCase(removeFromWishlist.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to remove from wishlist';
      });
  },
});

export const { clearError, clearWishlist } = wishlistSlice.actions;

// Selectors
export const selectWishlist = (state: RootState) => state.wishlist.wishlist;
export const selectWishlistLoading = (state: RootState) => state.wishlist.loading;
export const selectWishlistError = (state: RootState) => state.wishlist.error;
export const selectIsInWishlist = (state: RootState, productId: string) =>
  state.wishlist.wishlist?.items.some((item) => item.productId === productId) ?? false;

export default wishlistSlice.reducer;
