import { configureStore, combineReducers } from '@reduxjs/toolkit';
import canvasReducer from './canvasSlice';
import menuRedirectReducer from './menuRedirectSlice';
import customStorage from './customStorage';
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

const persistConfig = {
  key: 'root',
  version: 1,
  storage: customStorage,
};
const rootReducer = combineReducers({
  canvas: canvasReducer,
  menuRedirect: menuRedirectReducer,
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
