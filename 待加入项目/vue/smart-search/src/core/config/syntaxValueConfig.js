// 字段提示
const SYNTAX_VALUES = {
  'ANCS_TYPE': [{
    'value': 'UNIVERSITY',
    'desc': {
      'cn': '院校/研究所',
      'en': 'Academy',
      'jp': '大学・学院/研究所',
      'tw': '院校/研究所'
    }
  }, {
    'value': 'ACADEMY',
    'desc': {
      'cn': '院校/研究所',
      'en': 'Academy',
      'jp': '大学・学院/研究所',
      'tw': '院校/研究所'
    }
  }, {
    'value': 'COMPANY',
    'desc': {
      'cn': '公司',
      'en': 'Company',
      'jp': '会社',
      'tw': '公司'
    }
  }, {
    'value': 'GOVERNMENT',
    'desc': {
      'cn': '政府机构',
      'en': 'Government',
      'jp': '政府機関',
      'tw': '政府機構'
    }
  }, {
    'value': 'PERSON',
    'desc': {
      'cn': '个人',
      'en': 'Person',
      'jp': '個人',
      'tw': '個人'
    }
  }, {
    'value': 'OTHER',
    'desc': {
      'cn': '其他',
      'en': 'Other',
      'jp': 'その他',
      'tw': '其他'
    }
  }],
  'AUTHORITY': [{
    'value': 'AM',
    'desc': {
      'cn': '亚美尼亚',
      'en': 'Armenia',
      'jp': 'アルメニア',
      'tw': '亞美尼亞'
    }
  }, {
    'value': 'AP',
    'desc': {
      'cn': '非洲地区知识产权组织',
      'en': 'ARIPO',
      'jp': 'アフリカ広域知的財産機関',
      'tw': '非洲地區知識產權組織'
    }
  }, {
    'value': 'AR',
    'desc': {
      'cn': '阿根廷',
      'en': 'Argentina',
      'jp': 'アルゼンチン',
      'tw': '阿根廷'
    }
  }, {
    'value': 'AT',
    'desc': {
      'cn': '奥地利',
      'en': 'Austria',
      'jp': 'オーストリア',
      'tw': '奧地利'
    }
  }, {
    'value': 'AU',
    'desc': {
      'cn': '澳大利亚',
      'en': 'Australia',
      'jp': 'オーストラリア',
      'tw': '澳大利亞'
    }
  }, {
    'value': 'BA',
    'desc': {
      'cn': '波黑',
      'en': 'Bosnia and Herzegovina',
      'jp': 'ボスニア・ヘルツェゴビナ',
      'tw': '波黑'
    }
  }, {
    'value': 'BE',
    'desc': {
      'cn': '比利时',
      'en': 'Belgium',
      'jp': 'ベルギー',
      'tw': '比利時'
    }
  }, {
    'value': 'BG',
    'desc': {
      'cn': '保加利亚',
      'en': 'Bulgaria',
      'jp': 'ブルガリア',
      'tw': '保加利亞'
    }
  }, {
    'value': 'BR',
    'desc': {
      'cn': '巴西',
      'en': 'Brazil',
      'jp': 'ブラジル',
      'tw': '巴西'
    }
  }, {
    'value': 'BY',
    'desc': {
      'cn': '白俄罗斯',
      'en': 'Belarus',
      'jp': 'ベラルーシ',
      'tw': '白俄羅斯'
    }
  }, {
    'value': 'CA',
    'desc': {
      'cn': '加拿大',
      'en': 'Canada',
      'jp': 'カナダ',
      'tw': '加拿大'
    }
  }, {
    'value': 'CH',
    'desc': {
      'cn': '瑞士',
      'en': 'Switzerland',
      'jp': 'スイス',
      'tw': '瑞士'
    }
  }, {
    'value': 'CL',
    'desc': {
      'cn': '智利',
      'en': 'Chile',
      'jp': 'チリ',
      'tw': '智利'
    }
  }, {
    'value': 'CN',
    'desc': {
      'cn': '中国',
      'en': 'China',
      'jp': '中国',
      'tw': '中國'
    }
  }, {
    'value': 'CO',
    'desc': {
      'cn': '哥伦比亚',
      'en': 'Colombia',
      'jp': 'コロンビア',
      'tw': '哥倫比亞'
    }
  }, {
    'value': 'CR',
    'desc': {
      'cn': '哥斯达黎加',
      'en': 'Costa Rica',
      'jp': 'コスタリカ',
      'tw': '哥斯達黎加'
    }
  }, {
    'value': 'CS',
    'desc': {
      'cn': '捷克共斯洛伐克共和国',
      'en': 'Czech Slovak Rep.',
      'jp': 'チェコスロバキア共和国',
      'tw': '捷克共斯洛伐克共和國'
    }
  }, {
    'value': 'CU',
    'desc': {
      'cn': '古巴',
      'en': 'Cuba',
      'jp': 'キューバ',
      'tw': '古巴'
    }
  }, {
    'value': 'CY',
    'desc': {
      'cn': '塞浦路斯',
      'en': 'Cyprus',
      'jp': 'キプロス',
      'tw': '塞浦路斯'
    }
  }, {
    'value': 'CZ',
    'desc': {
      'cn': '捷克',
      'en': 'Czech Republic',
      'jp': 'チェコ',
      'tw': '捷克'
    }
  }, {
    'value': 'DD',
    'desc': {
      'cn': '东德',
      'en': 'East Germany',
      'jp': '東ドイツ',
      'tw': '東德'
    }
  }, {
    'value': 'DE',
    'desc': {
      'cn': '德国',
      'en': 'Germany',
      'jp': 'ドイツ',
      'tw': '德國'
    }
  }, {
    'value': 'DK',
    'desc': {
      'cn': '丹麦',
      'en': 'Denmark',
      'jp': 'デンマーク',
      'tw': '丹麥'
    }
  }, {
    'value': 'DO',
    'desc': {
      'cn': '多米尼加共和国',
      'en': 'Dominica Rep.',
      'jp': 'ドミニカ共和国',
      'tw': '多米尼加共和國'
    }
  }, {
    'value': 'DZ',
    'desc': {
      'cn': '阿尔及利亚',
      'en': 'Algeria',
      'jp': 'アルジェリア',
      'tw': '阿爾及利亞'
    }
  }, {
    'value': 'EA',
    'desc': {
      'cn': '欧亚专利局',
      'en': 'EAPO',
      'jp': 'ユーラシア特許機構',
      'tw': '歐亞專利局'
    }
  }, {
    'value': 'EC',
    'desc': {
      'cn': '厄瓜多尔',
      'en': 'Ecuador',
      'jp': 'エクアドル',
      'tw': '厄瓜多爾'
    }
  }, {
    'value': 'EE',
    'desc': {
      'cn': '爱沙尼亚',
      'en': 'Estonia',
      'jp': 'エストニア',
      'tw': '愛沙尼亞'
    }
  }, {
    'value': 'EG',
    'desc': {
      'cn': '埃及',
      'en': 'Egypt',
      'jp': 'エジプト',
      'tw': '埃及'
    }
  }, {
    'value': 'EM',
    'desc': {
      'cn': '内部市场协调局',
      'en': 'OHIM',
      'jp': '欧州共同体商標意匠庁',
      'tw': '內部市場協調局'
    }
  }, {
    'value': 'EP',
    'desc': {
      'cn': '欧洲',
      'en': 'EPO',
      'jp': 'ヨーロッパ',
      'tw': '歐洲'
    }
  }, {
    'value': 'ES',
    'desc': {
      'cn': '西班牙',
      'en': 'Spain',
      'jp': 'スペイン',
      'tw': '西班牙'
    }
  }, {
    'value': 'EU',
    'desc': {
      'cn': '欧盟',
      'en': 'EUIPO',
      'jp': '欧州連合知的財産庁',
      'tw': '歐盟'
    }
  }, {
    'value': 'FI',
    'desc': {
      'cn': '芬兰',
      'en': 'Finland',
      'jp': 'フィンランド',
      'tw': '芬蘭'
    }
  }, {
    'value': 'FR',
    'desc': {
      'cn': '法国',
      'en': 'France',
      'jp': 'フランス',
      'tw': '法國'
    }
  }, {
    'value': 'GB',
    'desc': {
      'cn': '英国',
      'en': 'Great Britain',
      'jp': 'イギリス',
      'tw': '英國'
    }
  }, {
    'value': 'GC',
    'desc': {
      'cn': '海湾地区阿拉伯国家合作委员会专利局',
      'en': 'GCC',
      'jp': 'アラブ湾岸協力会議特許庁',
      'tw': '海灣地區阿拉伯國家合作委員會專利局'
    }
  }, {
    'value': 'GE',
    'desc': {
      'cn': '格鲁吉亚',
      'en': 'Georgia',
      'jp': 'ジョージア',
      'tw': '格魯吉亞'
    }
  }, {
    'value': 'GR',
    'desc': {
      'cn': '希腊',
      'en': 'Greece',
      'jp': 'ギリシャ',
      'tw': '希臘'
    }
  }, {
    'value': 'GT',
    'desc': {
      'cn': '危地马拉',
      'en': 'Guatemala',
      'jp': 'グアテマラ',
      'tw': '危地馬拉'
    }
  }, {
    'value': 'HK',
    'desc': {
      'cn': '中国香港',
      'en': 'China Hong Kong',
      'jp': '中国香港',
      'tw': '中國香港'
    }
  }, {
    'value': 'HN',
    'desc': {
      'cn': '洪都拉斯',
      'en': 'Honduras',
      'jp': 'ホンジュラス',
      'tw': '洪都拉斯'
    }
  }, {
    'value': 'HR',
    'desc': {
      'cn': '克罗地亚',
      'en': 'Croatia',
      'jp': 'クロアチア',
      'tw': '克羅地亞'
    }
  }, {
    'value': 'HU',
    'desc': {
      'cn': '匈牙利',
      'en': 'Hungary',
      'jp': 'ハンガリー',
      'tw': '匈牙利'
    }
  }, {
    'value': 'ID',
    'desc': {
      'cn': '印度尼西亚',
      'en': 'Indonesia',
      'jp': 'インドネシア',
      'tw': '印度尼西亞'
    }
  }, {
    'value': 'IE',
    'desc': {
      'cn': '爱尔兰',
      'en': 'Ireland',
      'jp': 'アイルランド',
      'tw': '愛爾蘭'
    }
  }, {
    'value': 'IL',
    'desc': {
      'cn': '以色列',
      'en': 'Israel',
      'jp': 'イスラエル',
      'tw': '以色列'
    }
  }, {
    'value': 'IN',
    'desc': {
      'cn': '印度',
      'en': 'India',
      'jp': 'インド',
      'tw': '印度'
    }
  }, {
    'value': 'IS',
    'desc': {
      'cn': '冰岛',
      'en': 'Iceland',
      'jp': 'アイスランド',
      'tw': '冰島'
    }
  }, {
    'value': 'IT',
    'desc': {
      'cn': '意大利',
      'en': 'Italy',
      'jp': 'イタリア',
      'tw': '意大利'
    }
  }, {
    'value': 'JP',
    'desc': {
      'cn': '日本',
      'en': 'Japan',
      'jp': '日本',
      'tw': '日本'
    }
  }, {
    'value': 'KE',
    'desc': {
      'cn': '肯尼亚',
      'en': 'Kenya',
      'jp': 'ケニア',
      'tw': '肯尼亞'
    }
  }, {
    'value': 'KR',
    'desc': {
      'cn': '韩国',
      'en': 'Korea',
      'jp': '韓国',
      'tw': '韓國'
    }
  }, {
    'value': 'KZ',
    'desc': {
      'cn': '哈萨克斯坦',
      'en': 'Kazakstan',
      'jp': 'カザフスタン',
      'tw': '哈薩克斯坦'
    }
  }, {
    'value': 'LT',
    'desc': {
      'cn': '立陶宛',
      'en': 'Lithuania',
      'jp': 'リトアニア',
      'tw': '立陶宛'
    }
  }, {
    'value': 'LU',
    'desc': {
      'cn': '卢森堡',
      'en': 'Luxembourg',
      'jp': 'ルクセンブルク',
      'tw': '盧森堡'
    }
  }, {
    'value': 'LV',
    'desc': {
      'cn': '拉脱维亚',
      'en': 'Latvia',
      'jp': 'ラトビア',
      'tw': '拉脫維亞'
    }
  }, {
    'value': 'MA',
    'desc': {
      'cn': '摩洛哥',
      'en': 'Morocco',
      'jp': 'モロッコ',
      'tw': '摩洛哥'
    }
  }, {
    'value': 'MC',
    'desc': {
      'cn': '摩纳哥',
      'en': 'Monaco',
      'jp': 'モナコ',
      'tw': '摩納哥'
    }
  }, {
    'value': 'MD',
    'desc': {
      'cn': '摩尔多瓦',
      'en': 'Moldova',
      'jp': 'モルドバ',
      'tw': '摩爾多瓦'
    }
  }, {
    'value': 'ME',
    'desc': {
      'cn': '黑山共和国',
      'en': 'Montenegro',
      'jp': 'モンテネグロ',
      'tw': '黑山共和國'
    }
  }, {
    'value': 'MN',
    'desc': {
      'cn': '蒙古',
      'en': 'Mongolia',
      'jp': 'モンゴル',
      'tw': '蒙古'
    }
  }, {
    'value': 'MO',
    'desc': {
      'cn': '中国澳门',
      'en': 'China Macao',
      'jp': '中国マカオ',
      'tw': '中國澳門'
    }
  }, {
    'value': 'MT',
    'desc': {
      'cn': '马耳他',
      'en': 'Malta',
      'jp': 'マルタ',
      'tw': '馬耳他'
    }
  }, {
    'value': 'MW',
    'desc': {
      'cn': '马拉维',
      'en': 'Malawi',
      'jp': 'マラウイ',
      'tw': '馬拉維'
    }
  }, {
    'value': 'MX',
    'desc': {
      'cn': '墨西哥',
      'en': 'Mexico',
      'jp': 'メキシコ',
      'tw': '墨西哥'
    }
  }, {
    'value': 'MY',
    'desc': {
      'cn': '马来西亚',
      'en': 'Malaysia',
      'jp': 'マレーシア',
      'tw': '馬來西亞'
    }
  }, {
    'value': 'MZ',
    'desc': {
      'cn': '莫桑比克',
      'en': 'Mozambique',
      'jp': 'モザンビーク',
      'tw': '莫桑比克'
    }
  }, {
    'value': 'NI',
    'desc': {
      'cn': '尼加拉瓜',
      'en': 'Nicaragua',
      'jp': 'ニカラグア',
      'tw': '尼加拉瓜'
    }
  }, {
    'value': 'NL',
    'desc': {
      'cn': '荷兰',
      'en': 'Netherlands',
      'jp': 'オランダ',
      'tw': '荷蘭'
    }
  }, {
    'value': 'NO',
    'desc': {
      'cn': '挪威',
      'en': 'Norway',
      'jp': 'ノルウェー',
      'tw': '挪威'
    }
  }, {
    'value': 'NZ',
    'desc': {
      'cn': '新西兰',
      'en': 'New Zealand',
      'jp': 'ニュージーランド',
      'tw': '新西蘭'
    }
  }, {
    'value': 'OA',
    'desc': {
      'cn': '非洲知识产权组织',
      'en': 'OAPI',
      'jp': 'アフリカ知的財産機関',
      'tw': '非洲知識產權組織'
    }
  }, {
    'value': 'PA',
    'desc': {
      'cn': '巴拿马',
      'en': 'Panama',
      'jp': 'パナマ',
      'tw': '巴拿馬'
    }
  }, {
    'value': 'PE',
    'desc': {
      'cn': '秘鲁',
      'en': 'Peru',
      'jp': 'ペルー',
      'tw': '秘魯'
    }
  }, {
    'value': 'PH',
    'desc': {
      'cn': '菲律宾',
      'en': 'Philippines',
      'jp': 'フィリピン',
      'tw': '菲律賓'
    }
  }, {
    'value': 'PL',
    'desc': {
      'cn': '波兰',
      'en': 'Poland',
      'jp': 'ポーランド',
      'tw': '波蘭'
    }
  }, {
    'value': 'PT',
    'desc': {
      'cn': '葡萄牙',
      'en': 'Portugal',
      'jp': 'ポルトガル',
      'tw': '葡萄牙'
    }
  }, {
    'value': 'RO',
    'desc': {
      'cn': '罗马尼亚',
      'en': 'Romania',
      'jp': 'ルーマニア',
      'tw': '羅馬尼亞'
    }
  }, {
    'value': 'RS',
    'desc': {
      'cn': '塞尔维亚共和国',
      'en': 'Republic of Serbia',
      'jp': 'セルビアの共和国',
      'tw': '塞爾維亞共和國'
    }
  }, {
    'value': 'RU',
    'desc': {
      'cn': '俄罗斯',
      'en': 'Russia',
      'jp': 'ロシア',
      'tw': '俄羅斯'
    }
  }, {
    'value': 'SE',
    'desc': {
      'cn': '瑞典',
      'en': 'Sweden',
      'jp': 'スウェーデン',
      'tw': '瑞典'
    }
  }, {
    'value': 'SG',
    'desc': {
      'cn': '新加坡',
      'en': 'Singapore',
      'jp': 'シンガポール',
      'tw': '新加坡'
    }
  }, {
    'value': 'SI',
    'desc': {
      'cn': '斯洛文尼亚',
      'en': 'Slovenia',
      'jp': 'スロベニア',
      'tw': '斯洛文尼亞'
    }
  }, {
    'value': 'SK',
    'desc': {
      'cn': '斯洛伐克',
      'en': 'Slovakia',
      'jp': 'スロバキア',
      'tw': '斯洛伐克'
    }
  }, {
    'value': 'SM',
    'desc': {
      'cn': '圣马力诺',
      'en': 'San Marino',
      'jp': 'サンマリノ',
      'tw': '聖馬力諾'
    }
  }, {
    'value': 'SU',
    'desc': {
      'cn': '前苏联',
      'en': 'Soviet Union',
      'jp': 'ソビエト連邦',
      'tw': '前蘇聯'
    }
  }, {
    'value': 'SV',
    'desc': {
      'cn': '萨尔瓦多',
      'en': 'El Salvador',
      'jp': 'エルサルバドル',
      'tw': '薩爾瓦多'
    }
  }, {
    'value': 'TH',
    'desc': {
      'cn': '泰国',
      'en': 'Thailand',
      'jp': 'タイ',
      'tw': '泰國'
    }
  }, {
    'value': 'TJ',
    'desc': {
      'cn': '塔吉克斯',
      'en': 'Tajikstan',
      'jp': 'タジキスタン',
      'tw': '塔吉克斯'
    }
  }, {
    'value': 'TR',
    'desc': {
      'cn': '土耳其',
      'en': 'Turkey',
      'jp': 'トルコ',
      'tw': '土耳其'
    }
  }, {
    'value': 'TT',
    'desc': {
      'cn': '特立尼达和多巴哥',
      'en': 'Trinidad and Tobago',
      'jp': 'トリニダード・トバゴ',
      'tw': '特立尼達和多巴哥'
    }
  }, {
    'value': 'TW',
    'desc': {
      'cn': '中国台湾',
      'en': 'China Taiwan',
      'jp': '中国台湾',
      'tw': '中國台灣'
    }
  }, {
    'value': 'UA',
    'desc': {
      'cn': '乌克兰',
      'en': 'Ukraine',
      'jp': 'ウクライナ',
      'tw': '烏克蘭'
    }
  }, {
    'value': 'US',
    'desc': {
      'cn': '美国',
      'en': 'United States',
      'jp': 'アメリカ',
      'tw': '美國'
    }
  }, {
    'value': 'UY',
    'desc': {
      'cn': '乌拉圭',
      'en': 'Uruguay',
      'jp': 'ウルグアイ',
      'tw': '烏拉圭'
    }
  }, {
    'value': 'UZ',
    'desc': {
      'cn': '乌兹别克斯坦',
      'en': 'Uzbekistan',
      'jp': 'ウズベキスタン',
      'tw': '烏茲別克斯坦'
    }
  }, {
    'value': 'VN',
    'desc': {
      'cn': '越南',
      'en': 'Vietnam',
      'jp': 'ベトナム',
      'tw': '越南'
    }
  }, {
    'value': 'WO',
    'desc': {
      'cn': 'PCT申请',
      'en': 'WIPO',
      'jp': '世界知的所有権機関',
      'tw': 'PCT申請'
    }
  }, {
    'value': 'YU',
    'desc': {
      'cn': '南斯拉夫',
      'en': 'Yugoslavia',
      'jp': 'ユーゴスラビア',
      'tw': '南斯拉夫'
    }
  }, {
    'value': 'ZA',
    'desc': {
      'cn': '南非',
      'en': 'South Africa',
      'jp': '南アフリカ',
      'tw': '南非'
    }
  }, {
    'value': 'ZM',
    'desc': {
      'cn': '赞比亚',
      'en': 'Zambia',
      'jp': 'ザンビア',
      'tw': '贊比亞'
    }
  }, {
    'value': 'ZW',
    'desc': {
      'cn': '津巴布韦',
      'en': 'Zimbabwe',
      'jp': 'ジンバブエ',
      'tw': '津巴布韋'
    }
  }],
  'PATENT_TYPE': [{
    'value': 'A',
    'desc': {
      'cn': '发明申请',
      'en': 'Applications',
      'jp': '特許出願',
      'tw': '發明申請'
    }
  }, {
    'value': 'B',
    'desc': {
      'cn': '授权发明',
      'en': 'Patents',
      'jp': '特許認定',
      'tw': '授權發明'
    }
  }, {
    'value': 'U',
    'desc': {
      'cn': '实用新型',
      'en': 'Utilities',
      'jp': '実用新案',
      'tw': '實用新型'
    }
  }, {
    'value': 'D',
    'desc': {
      'cn': '外观设计',
      'en': 'Design',
      'jp': '意匠',
      'tw': '外觀設計'
    }
  }],
  'PLE_TYPE': [{
    'value': '质押',
    'desc': {
      'cn': '质押',
      'en': 'Pledge',
      'jp': '质押',
      'tw': '質押'
    }
  }, {
    'value': '保全',
    'desc': {
      'cn': '保全',
      'en': 'Preservation',
      'jp': '保全',
      'tw': '保全'
    }
  }, {
    'value': '解除',
    'desc': {
      'cn': '解除',
      'en': 'Rescission',
      'jp': '解除',
      'tw': '解除'
    }
  }],
  'TRIAL_GRADE': [{
    'value': '一审',
    'desc': {
      'cn': '一审',
      'en': '一审',
      'jp': '一审',
      'tw': '一審'
    }
  }, {
    'value': '二审',
    'desc': {
      'cn': '二审',
      'en': '二审',
      'jp': '二审',
      'tw': '二審'
    }
  }, {
    'value': '再审',
    'desc': {
      'cn': '再审',
      'en': '再审',
      'jp': '再审',
      'tw': '再審'
    }
  }],
  'CASE_NATURE': [{
    'value': '民事案件',
    'desc': {
      'cn': '民事案件',
      'en': '民事案件',
      'jp': '民事案件',
      'tw': '民事案件'
    }
  }, {
    'value': '行政案件',
    'desc': {
      'cn': '行政案件',
      'en': '行政案件',
      'jp': '行政案件',
      'tw': '行政案件'
    }
  }, {
    'value': '执行案件',
    'desc': {
      'cn': '执行案件',
      'en': '执行案件',
      'jp': '执行案件',
      'tw': '執行案件'
    }
  }],
  'CASE_REGION': [{
    'value': '北京',
    'desc': {
      'cn': '北京',
      'en': '北京',
      'jp': '北京',
      'tw': '北京'
    }
  }, {
    'value': '天津',
    'desc': {
      'cn': '天津',
      'en': '天津',
      'jp': '天津',
      'tw': '天津'
    }
  }, {
    'value': '重庆',
    'desc': {
      'cn': '重庆',
      'en': '重庆',
      'jp': '重庆',
      'tw': '重慶'
    }
  }, {
    'value': '上海',
    'desc': {
      'cn': '上海',
      'en': '上海',
      'jp': '上海',
      'tw': '上海'
    }
  }, {
    'value': '河北',
    'desc': {
      'cn': '河北省',
      'en': '河北省',
      'jp': '河北省',
      'tw': 'hebei_province'
    }
  }, {
    'value': '山西',
    'desc': {
      'cn': '山西省',
      'en': '山西省',
      'jp': '山西省',
      'tw': '陕西省'
    }
  }, {
    'value': '辽宁',
    'desc': {
      'cn': '辽宁省',
      'en': '辽宁省',
      'jp': '辽宁省',
      'tw': '遼寧省'
    }
  }, {
    'value': '吉林',
    'desc': {
      'cn': '吉林省',
      'en': '吉林省',
      'jp': '吉林省',
      'tw': '吉林省'
    }
  }, {
    'value': '黑龙江',
    'desc': {
      'cn': '黑龙江省',
      'en': '黑龙江省',
      'jp': '黑龙江省',
      'tw': '黑龍江省'
    }
  }, {
    'value': '江苏',
    'desc': {
      'cn': '江苏省',
      'en': '江苏省',
      'jp': '江苏省',
      'tw': '江蘇省'
    }
  }, {
    'value': '浙江',
    'desc': {
      'cn': '浙江省',
      'en': '浙江省',
      'jp': '浙江省',
      'tw': '浙江省'
    }
  }, {
    'value': '安徽',
    'desc': {
      'cn': '安徽省',
      'en': '安徽省',
      'jp': '安徽省',
      'tw': '安徽省'
    }
  }, {
    'value': '福建',
    'desc': {
      'cn': '福建省',
      'en': '福建省',
      'jp': '福建省',
      'tw': '福建省'
    }
  }, {
    'value': '江西',
    'desc': {
      'cn': '江西省',
      'en': '江西省',
      'jp': '江西省',
      'tw': '江西省'
    }
  }, {
    'value': '山东',
    'desc': {
      'cn': '山东省',
      'en': '山东省',
      'jp': '山东省',
      'tw': '山東省'
    }
  }, {
    'value': '河南',
    'desc': {
      'cn': '河南省',
      'en': '河南省',
      'jp': '河南省',
      'tw': '河南省'
    }
  }, {
    'value': '湖北',
    'desc': {
      'cn': '湖北省',
      'en': '湖北省',
      'jp': '湖北省',
      'tw': '湖北省'
    }
  }, {
    'value': '湖南',
    'desc': {
      'cn': '湖南省',
      'en': '湖南省',
      'jp': '湖南省',
      'tw': '湖南省'
    }
  }, {
    'value': '广东',
    'desc': {
      'cn': '广东省',
      'en': '广东省',
      'jp': '广东省',
      'tw': '廣東省'
    }
  }, {
    'value': '海南',
    'desc': {
      'cn': '海南省',
      'en': '海南省',
      'jp': '海南省',
      'tw': '海南省'
    }
  }, {
    'value': '四川',
    'desc': {
      'cn': '四川省',
      'en': '四川省',
      'jp': '四川省',
      'tw': '四川省'
    }
  }, {
    'value': '贵州',
    'desc': {
      'cn': '贵州省',
      'en': '贵州省',
      'jp': '贵州省',
      'tw': '貴州省'
    }
  }, {
    'value': '云南',
    'desc': {
      'cn': '云南省',
      'en': '云南省',
      'jp': '云南省',
      'tw': '雲南省'
    }
  }, {
    'value': '陕西',
    'desc': {
      'cn': '陕西省',
      'en': '陕西省',
      'jp': '陕西省',
      'tw': '山西省'
    }
  }, {
    'value': '甘肃',
    'desc': {
      'cn': '甘肃省',
      'en': '甘肃省',
      'jp': '甘肃省',
      'tw': '甘肅省'
    }
  }, {
    'value': '青海',
    'desc': {
      'cn': '青海省',
      'en': '青海省',
      'jp': '青海省',
      'tw': '青海省'
    }
  }, {
    'value': '台湾',
    'desc': {
      'cn': '台湾省',
      'en': '台湾省',
      'jp': '台湾省',
      'tw': '台灣省'
    }
  }, {
    'value': '内蒙古',
    'desc': {
      'cn': '内蒙古自治区',
      'en': '内蒙古自治区',
      'jp': '内蒙古自治区',
      'tw': '內蒙古自治區'
    }
  }, {
    'value': '广西',
    'desc': {
      'cn': '广西壮族自治区',
      'en': '广西壮族自治区',
      'jp': '广西壮族自治区',
      'tw': '廣西壯族自治區'
    }
  }, {
    'value': '西藏',
    'desc': {
      'cn': '西藏自治区',
      'en': '西藏自治区',
      'jp': '西藏自治区',
      'tw': '西藏自治區'
    }
  }, {
    'value': '宁夏',
    'desc': {
      'cn': '宁夏回族自治区',
      'en': '宁夏回族自治区',
      'jp': '宁夏回族自治区',
      'tw': '寧夏回族自治區'
    }
  }, {
    'value': '新疆',
    'desc': {
      'cn': '新疆维吾尔自治区',
      'en': '新疆维吾尔自治区',
      'jp': '新疆维吾尔自治区',
      'tw': '新疆維吾爾自治區'
    }
  }, {
    'value': '香港',
    'desc': {
      'cn': '香港特别行政区',
      'en': '香港特别行政区',
      'jp': '香港特别行政区',
      'tw': '香港特別行政區'
    }
  }, {
    'value': '澳门',
    'desc': {
      'cn': '澳门特别行政区',
      'en': '澳门特别行政区',
      'jp': '澳门特别行政区',
      'tw': '澳門特別行政區'
    }
  }],
  'EXCLUSIVITY': [{
    'value': 'Exclusive',
    'desc': {
      'cn': '独占许可',
      'en': 'Exclusive',
      'jp': '独占ライセンス',
      'tw': '獨占許可'
    }
  }, {
    'value': 'Non-Exclusive',
    'desc': {
      'cn': '普通许可',
      'en': 'Non-Exclusive',
      'jp': '通常のライセンス',
      'tw': '普通許可'
    }
  }, {
    'value': 'Multi-Exclusivity',
    'desc': {
      'cn': '多重许可',
      'en': 'Multi-Exclusivity',
      'jp': '複数のライセンス',
      'tw': '多重許可'
    }
  }, {
    'value': 'Sole',
    'desc': {
      'cn': '排他许可',
      'en': 'Sole License',
      'jp': '独占ライセンス',
      'tw': '排他許可'
    }
  }, {
    'value': 'Cross',
    'desc': {
      'cn': '交叉许可',
      'tw': '交叉許可',
      'jp': 'クロスライセンス',
      'en': 'Cross License'
    }
  }, {
    'value': 'Sub',
    'desc': {
      'cn': '分许可',
      'tw': '分許可',
      'jp': 'サブライセンス',
      'en': 'Sub License'
    }
  }, {
    'value': 'Other',
    'desc': {
      'cn': '其他',
      'tw': '其他',
      'jp': 'その他の',
      'en': 'Others'
    }
  }],
  'OUTCOME_STATUS': [{
    'value': 'Closed (closed)',
    'desc': {
      'cn': 'Closed (closed)',
      'en': 'Closed (closed)',
      'jp': 'Closed (closed)',
      'tw': 'Closed (closed)'
    }
  }, {
    'value': 'Closed (closed after remand)',
    'desc': {
      'cn': 'Closed (closed after remand)',
      'en': 'Closed (closed after remand)',
      'jp': 'Closed (closed after remand)',
      'tw': 'Closed (closed after remand)'
    }
  }, {
    'value': 'Closed (on appeal)',
    'desc': {
      'cn': 'Closed (on appeal)',
      'en': 'Closed (on appeal)',
      'jp': 'Closed (on appeal)',
      'tw': 'Closed (on appeal)'
    }
  }, {
    'value': 'Consolidated',
    'desc': {
      'cn': 'Consolidated',
      'en': 'Consolidated',
      'jp': 'Consolidated',
      'tw': 'Consolidated'
    }
  }, {
    'value': 'Open (open after remand)',
    'desc': {
      'cn': 'Open (open after remand)',
      'en': 'Open (open after remand)',
      'jp': 'Open (open after remand)',
      'tw': 'Open (open after remand)'
    }
  }, {
    'value': 'Open (open original)',
    'desc': {
      'cn': 'Open (open original)',
      'en': 'Open (open original)',
      'jp': 'Open (open original)',
      'tw': 'Open (open original)'
    }
  }, {
    'value': 'Stayed (pending reexam and other)',
    'desc': {
      'cn': 'Stayed (pending reexam and other)',
      'en': 'Stayed (pending reexam and other)',
      'jp': 'Stayed (pending reexam and other)',
      'tw': 'Stayed (pending reexam and other)'
    }
  }],
  'LEGAL_STATUS': [{
    'value': '1',
    'desc': {
      'cn': '公开',
      'en': 'Published',
      'jp': '公開',
      'tw': '公開'
    }
  }, {
    'value': '2',
    'desc': {
      'cn': '实质审查',
      'en': 'Examining',
      'jp': '審査係属中',
      'tw': '實質審查'
    }
  }, {
    'value': '3',
    'desc': {
      'cn': '授权',
      'en': 'Granted',
      'jp': '登録',
      'tw': '授權'
    }
  }, {
    'value': '8',
    'desc': {
      'cn': '避重授权',
      'en': 'Double',
      'jp': '二重特許',
      'tw': '避重授權'
    }
  }, {
    'value': '11',
    'desc': {
      'cn': '撤回',
      'en': 'Withdrawn',
      'jp': '取下',
      'tw': '撤回'
    }
  }, {
    'value': '13',
    'desc': {
      'cn': '驳回',
      'en': 'Rejected',
      'jp': '拒絶査定',
      'tw': '駁回'
    }
  }, {
    'value': '14',
    'desc': {
      'cn': '全部撤销',
      'en': 'Revoked',
      'jp': '全部無効',
      'tw': '全部撤銷'
    }
  }, {
    'value': '15',
    'desc': {
      'cn': '期限届满',
      'en': 'Expired',
      'jp': '期間満了',
      'tw': '期限屆滿'
    }
  }, {
    'value': '16',
    'desc': {
      'cn': '未缴年费',
      'en': 'Non-payment',
      'jp': '年金不納',
      'tw': '未繳年費'
    }
  }, {
    'value': '21',
    'desc': {
      'cn': '权利恢复',
      'en': 'Restoration',
      'jp': '権利回復',
      'tw': '權利恢復'
    }
  }, {
    'value': '22',
    'desc': {
      'cn': '权利终止',
      'en': 'Ceased',
      'jp': '権利消滅',
      'tw': '權利終止'
    }
  }, {
    'value': '23',
    'desc': {
      'cn': '部分无效',
      'en': 'P-Revoked',
      'jp': '一部無効',
      'tw': '部分無效'
    }
  }, {
    'value': '30',
    'desc': {
      'cn': '放弃',
      'en': 'Abandoned',
      'jp': '放棄',
      'tw': '放棄'
    }
  }],
  'SEP_SOURCE': [{
    'value': 'ETSI',
    'desc': {
      'cn': '欧洲电信标准委员会',
      'en': 'European Telecommunications Standards Institute',
      'jp': '欧州電気通信標準化機構',
      'tw': '歐洲電信標準委員會'
    }
  }, {
    'value': 'IEC',
    'desc': {
      'cn': '国际电工委员会',
      'en': 'International Electro technical Commission',
      'jp': '国際電気標準会議',
      'tw': '國際電工委員會'
    }
  }, {
    'value': 'IEEE',
    'desc': {
      'cn': '电气和电子工程师协会',
      'en': 'Institute of Electrical and Electronics Engineers',
      'jp': '電気電子技術者協会',
      'tw': '電氣和電子工程師協會'
    }
  }, {
    'value': 'ISO',
    'desc': {
      'cn': '国际标准化组织',
      'en': 'International Organization for Standardization',
      'jp': '国際標準化機構',
      'tw': '國際標準化組織'
    }
  }, {
    'value': 'ANSI',
    'desc': {
      'cn': '美国国家标准学会',
      'en': 'American National Standards Institute',
      'jp': '米国規格協会',
      'tw': '美國國家標準學會'
    }
  }, {
    'value': 'CEN',
    'desc': {
      'cn': '欧洲标准委员会',
      'en': 'European Committee for Standardization',
      'jp': '欧州標準化委員会',
      'tw': '歐洲標準委員會'
    }
  }],
  'LITIGATION': [{
    'value': '1',
    'desc': {
      'cn': '有诉讼信息',
      'en': 'With litigation information',
      'jp': '訴訟情報あり',
      'tw': '有訴訟信息'
    }
  }],
  'LICENSE': [{
    'value': '1',
    'desc': {
      'cn': '有许可信息',
      'en': 'With licensing information',
      'jp': '実施許諾あり',
      'tw': '有許可信息'
    }
  }],
  'PLEDGE': [{
    'value': '1',
    'desc': {
      'cn': '有质押信息',
      'en': 'With pledge information',
      'jp': '質権情報あり',
      'tw': '有質押信息'
    }
  }],
  'REEXAMINVALID': [{
    'value': '1',
    'desc': {
      'cn': '有复审无效信息',
      'en': 'With re-examination & invalidation information',
      'jp': '再審査＆無効情報あり',
      'tw': '有復審無效信息'
    }
  }],
  'GOV': [{
    'value': '1',
    'desc': {
      'cn': '有政府资助',
      'en': 'With government information',
      'jp': '政府援助あり',
      'tw': '有政府資助'
    }
  }]
};

export {
  SYNTAX_VALUES
};
