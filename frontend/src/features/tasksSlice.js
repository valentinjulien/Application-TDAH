import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  tasks: [],
};

export const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    addTask: (state, action) => {
      state.tasks.push(action.payload);
    },
    updateTask: (state, action) => {
      const index = state.tasks.findIndex(task => task.id === action.payload.id);
      if (index !== -1) {
        state.tasks[index] = action.payload;
      }
    },
    deleteTask: (state, action) => {
      state.tasks = state.tasks.filter(task => task.id !== action.payload);
    },
    classifyTask: (state, action) => {
      // Simuler classification IA
      const task = state.tasks.find(t => t.id === action.payload.id);
      if (task) {
        task.priority = action.payload.priority; // urgent/important, etc.
        task.quadrant = action.payload.quadrant; // 1,2,3,4
      }
    },
  },
});

export const { addTask, updateTask, deleteTask, classifyTask } = tasksSlice.actions;

export default tasksSlice.reducer;