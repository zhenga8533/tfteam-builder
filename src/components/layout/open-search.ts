/** Fired to open the site-wide search from anywhere, e.g. a not-found page's Search button. */
export const OPEN_SEARCH = "tfteam:open-search";

export const openSearch = () => dispatchEvent(new Event(OPEN_SEARCH));
