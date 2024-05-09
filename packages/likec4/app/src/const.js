export const ComponentName = {
  View: WEBCOMPONENT_PREFIX + '-view',
  Browser: WEBCOMPONENT_PREFIX + '-browser'
}

let BASE = import.meta.env.BASE_URL
if (!BASE.endsWith('/')) {
  BASE = BASE + '/'
}

export const useHasHistory = __USE_HASH_HISTORY__

export const basepath = useHasHistory ? '/' : BASE
