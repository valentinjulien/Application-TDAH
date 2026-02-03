import { configureStore } from '@reduxjs/toolkit';
import tasksReducer from './features/tasksSlice';
import calendarReducer from './features/calendarSlice';

export default configureStore({
  reducer: {
    tasks: tasksReducer,
    calendar: calendarReducer,
  },
});