import { createI18n } from 'vue-i18n'

export function createPlaygroundI18n() {
  return createI18n({
    legacy: false,
    globalInjection: false,
    locale: 'en',
    messages: {
      en: {
        caseFlow: {
          intake: 'Case intake',
          review: 'Evidence review',
          opened: 'Open',
          reviewing: 'In review',
          resolved: 'Resolved',
        },
      },
      'zh-CN': {
        caseFlow: {
          intake: '案件受理',
          review: '证据审查',
          opened: '待处理',
          reviewing: '审查中',
          resolved: '已解决',
        },
      },
    },
  })
}
