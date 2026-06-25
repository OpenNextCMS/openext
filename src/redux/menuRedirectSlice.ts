import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { toast } from 'sonner';
import type {
  MenuRedirectMapping,
  MenuItem,
  ContentItem,
  PluginState,
} from '@/types/menu-redirect';
import type { RootState, AppDispatch } from './store';

export type ContentTab = 'pages' | 'blogs' | 'blog-categories' | 'cms';

interface MenuRedirectState {
  pluginState: PluginState;
  activeHeaderId: string | null;
  headerName: string | null;
  menuItems: MenuItem[];
  mappings: Record<string, MenuRedirectMapping>; // keyed by menuItemId
  contentLists: Record<ContentTab, ContentItem[]>;
  selectedMenuItemId: string | null;
  searchQuery: string;
  loading: boolean;
  error: string | null;
}

const initialState: MenuRedirectState = {
  pluginState: { installed: false, enabled: false },
  activeHeaderId: null,
  headerName: null,
  menuItems: [],
  mappings: {},
  contentLists: { pages: [], blogs: [], 'blog-categories': [], cms: [] },
  selectedMenuItemId: null,
  searchQuery: '',
  loading: false,
  error: null,
};

/** The plugin is "active" when installed AND enabled. */
export function isPluginActive(s: PluginState): boolean {
  return !!s.installed && !!s.enabled;
}

export const loadPluginState = createAsyncThunk('menuRedirect/loadPluginState', async () => {
  const res = await fetch('/api/menu-redirect/lifecycle/status');
  const json = await res.json();
  return (json?.data ?? { installed: false, enabled: false }) as PluginState;
});

const slice = createSlice({
  name: 'menuRedirect',
  initialState,
  reducers: {
    setPluginState(state, action: PayloadAction<PluginState>) {
      state.pluginState = action.payload;
    },
    setActiveHeader(
      state,
      action: PayloadAction<{ headerId: string; headerName: string } | null>
    ) {
      state.activeHeaderId = action.payload?.headerId ?? null;
      state.headerName = action.payload?.headerName ?? null;
    },
    setMenuItems(state, action: PayloadAction<MenuItem[]>) {
      state.menuItems = action.payload;
    },
    setMappings(state, action: PayloadAction<MenuRedirectMapping[]>) {
      state.mappings = {};
      for (const m of action.payload) state.mappings[m.menuItemId] = m;
    },
    upsertMappingLocal(state, action: PayloadAction<MenuRedirectMapping>) {
      state.mappings[action.payload.menuItemId] = action.payload;
    },
    removeMappingLocal(state, action: PayloadAction<string>) {
      delete state.mappings[action.payload];
    },
    setContentList(
      state,
      action: PayloadAction<{ tab: ContentTab; items: ContentItem[] }>
    ) {
      state.contentLists[action.payload.tab] = action.payload.items;
    },
    setSelectedMenuItemId(state, action: PayloadAction<string | null>) {
      state.selectedMenuItemId = action.payload;
    },
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    resetMenuRedirect() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadPluginState.fulfilled, (state, action) => {
      state.pluginState = action.payload;
    });
  },
});

export const {
  setPluginState,
  setActiveHeader,
  setMenuItems,
  setMappings,
  upsertMappingLocal,
  removeMappingLocal,
  setContentList,
  setSelectedMenuItemId,
  setSearchQuery,
  setLoading,
  setError,
  resetMenuRedirect,
} = slice.actions;

// ---- Gated thunks (no network calls while the plugin is inactive) ----

export const loadHeader =
  (headerId?: string) => async (dispatch: AppDispatch, getState: () => RootState) => {
    if (!isPluginActive(getState().menuRedirect.pluginState)) return;
    dispatch(setLoading(true));
    try {
      const qs = headerId ? `?headerId=${headerId}` : '';
      const res = await fetch(`/api/menu-redirect/menu-items${qs}`);
      const json = await res.json();
      const data = json?.data;
      if (data?.headerId) {
        dispatch(setActiveHeader({ headerId: data.headerId, headerName: data.headerName }));
        dispatch(setMenuItems(data.menuItems || []));
      } else {
        dispatch(setActiveHeader(null));
        dispatch(setMenuItems([]));
      }
    } catch {
      dispatch(setError('Failed to load header'));
    } finally {
      dispatch(setLoading(false));
    }
  };

export const loadContent = () => async (dispatch: AppDispatch, getState: () => RootState) => {
  if (!isPluginActive(getState().menuRedirect.pluginState)) return;
  const tabs: { tab: ContentTab; url: string }[] = [
    { tab: 'pages', url: '/api/menu-redirect/pages' },
    { tab: 'blogs', url: '/api/menu-redirect/blogs' },
    { tab: 'blog-categories', url: '/api/menu-redirect/blog-categories' },
    { tab: 'cms', url: '/api/menu-redirect/cms-collections' },
  ];
  await Promise.all(
    tabs.map(async ({ tab, url }) => {
      try {
        const res = await fetch(url);
        const json = await res.json();
        dispatch(setContentList({ tab, items: Array.isArray(json?.data) ? json.data : [] }));
      } catch {
        /* ignore per-tab failures */
      }
    })
  );
};

export const loadMappings =
  (headerId: string) => async (dispatch: AppDispatch, getState: () => RootState) => {
    if (!isPluginActive(getState().menuRedirect.pluginState)) return;
    try {
      const res = await fetch(`/api/menu-redirect/list?headerId=${headerId}`);
      const json = await res.json();
      dispatch(setMappings(Array.isArray(json?.data) ? json.data : []));
    } catch {
      dispatch(setError('Failed to load mappings'));
    }
  };

export const createMapping =
  (payload: MenuRedirectMapping) => async (dispatch: AppDispatch, getState: () => RootState) => {
    if (!isPluginActive(getState().menuRedirect.pluginState)) return;
    const prev = getState().menuRedirect.mappings[payload.menuItemId];
    dispatch(upsertMappingLocal(payload)); // optimistic
    try {
      const res = await fetch('/api/menu-redirect/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to link');
      dispatch(upsertMappingLocal(json.data));
      toast.success('Menu item linked');
    } catch (e) {
      if (prev) dispatch(upsertMappingLocal(prev));
      else dispatch(removeMappingLocal(payload.menuItemId));
      toast.error((e as Error).message);
    }
  };

export const updateMapping =
  (id: string, patch: Partial<MenuRedirectMapping> & { menuItemId: string }) =>
  async (dispatch: AppDispatch, getState: () => RootState) => {
    if (!isPluginActive(getState().menuRedirect.pluginState)) return;
    const prev = getState().menuRedirect.mappings[patch.menuItemId];
    if (prev) dispatch(upsertMappingLocal({ ...prev, ...patch })); // optimistic
    try {
      const res = await fetch('/api/menu-redirect/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, ...patch }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to update');
      dispatch(upsertMappingLocal(json.data));
    } catch (e) {
      if (prev) dispatch(upsertMappingLocal(prev));
      toast.error((e as Error).message);
    }
  };

export const deleteMapping =
  (args: { id: string; menuItemId: string }) =>
  async (dispatch: AppDispatch, getState: () => RootState) => {
    if (!isPluginActive(getState().menuRedirect.pluginState)) return;
    const prev = getState().menuRedirect.mappings[args.menuItemId];
    dispatch(removeMappingLocal(args.menuItemId)); // optimistic
    try {
      const res = await fetch(`/api/menu-redirect/delete?id=${args.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json?.error?.message || 'Failed to unlink');
      }
      toast.success('Menu item unlinked');
    } catch (e) {
      if (prev) dispatch(upsertMappingLocal(prev));
      toast.error((e as Error).message);
    }
  };

export const bulkAutoMatch =
  (rows: Array<Partial<MenuRedirectMapping> & { menuItemId: string; headerId: string }>) =>
  async (dispatch: AppDispatch, getState: () => RootState) => {
    if (!isPluginActive(getState().menuRedirect.pluginState)) return;
    try {
      const res = await fetch('/api/menu-redirect/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mappings: rows }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Bulk match failed');
      const headerId = getState().menuRedirect.activeHeaderId;
      if (headerId) await dispatch(loadMappings(headerId));
      toast.success(`Linked ${rows.length} item(s)`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

// ---- Selectors ----
export const selectMenuRedirect = (s: RootState) => s.menuRedirect;
export const selectMappingFor = (menuItemId: string) => (s: RootState) =>
  s.menuRedirect.mappings[menuItemId];
export const selectFilteredContent = (tab: ContentTab) => (s: RootState) => {
  const q = s.menuRedirect.searchQuery.trim().toLowerCase();
  const list = s.menuRedirect.contentLists[tab] || [];
  if (!q) return list;
  return list.filter(
    (c) => c.label.toLowerCase().includes(q) || (c.slug || '').toLowerCase().includes(q)
  );
};

export default slice.reducer;
