import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  events: [],
  isConnected: false,
  loading: false,
};

export const calendarSlice = createSlice({
  name: 'calendar',
  initialState,
  reducers: {
    setConnected: (state, action) => {
      state.isConnected = action.payload;
    },
    setEvents: (state, action) => {
      state.events = action.payload;
    },
    addEvent: (state, action) => {
      state.events.push(action.payload);
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
});

export const { setConnected, setEvents, addEvent, setLoading } = calendarSlice.actions;

export default calendarSlice.reducer;