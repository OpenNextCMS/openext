import { configureStore, combineReducers } from '@reduxjs/toolkit';
import canvasReducer from './canvasSlice';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';

const persistConfig = {
  key: 'root',
  version: 1,
  storage,
};
const rootReducer = combineReducers({
  canvas: canvasReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export type RootReducerType = ReturnType<typeof rootReducer>;

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  devTools: true,
});

export const persistor = persistStore(store);

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = RootReducerType;
export type AppDispatch = typeof store.dispatch;
