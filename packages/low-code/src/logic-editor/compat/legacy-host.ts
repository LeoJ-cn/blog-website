export const AtomCenter = {
  baseId: 0,
  setBaseId(value: number): void {
    this.baseId = value
  },
}

export const PageCenter = {
  cur_page: undefined as undefined | { extra1?: string },
  localeManager: {
    getPageLocaleArray: (pageUuid?: string): Array<{ value: string; label: string }> => {
      void pageUuid
      return []
    },
  },
}
