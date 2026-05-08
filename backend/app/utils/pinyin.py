"""
家味 · Family Chef - 拼音工具
"""

from pypinyin import pinyin, Style


def get_pinyin_initial(text: str) -> str:
    """
    获取中文拼音首字母
    
    示例：
        get_pinyin_initial("麻婆豆腐") -> "MPDF"
        get_pinyin_initial("红烧肉") -> "HSR"
    """
    result = ""
    for char in text:
        # 跳过非中文字符
        if '\u4e00' <= char <= '\u9fff':
            py = pinyin(char, style=Style.FIRST_LETTER)
            if py and py[0] and py[0][0]:
                result += py[0][0].upper()
        else:
            result += char.upper()
    return result


def get_pinyin_full(text: str) -> str:
    """
    获取中文完整拼音
    
    示例：
        get_pinyin_full("麻婆豆腐") -> "má pó dòu fu"
    """
    result = pinyin(text, style=Style.NORMAL)
    return " ".join(["".join(item) for item in result])
