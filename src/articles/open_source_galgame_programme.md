# OSGP

小野心，个人还需要学习各种反汇编技术。

## 日志

- 2022年05月25日
    - 完成了 `毎日キスしてロリータ` 到 `renpy` 的移植。做到了全平台。

## 记录

### 2022年05月25日

``` python
"""
目前仅支持剧情脚本
将剧情脚本，也就是ks结尾的文件放入input中，会在output里生成对应的rpy文件。
目前只尝试了这家厂商的游戏。对于其他编码或者格式的游戏需要新写代码
有一些 label 和 jump 需要重新组织
比如样例的游戏，结束在 A010 上，接下来跳转到 ending 这里没有 ending，所以直接跳转到 B000 就好。
最后 B000 会跳转到 title，主需要在 start 里设置一个 label 跳转回 start 的 return 前就行。似乎直接 return 也不是不行。
"""


import re
import os
import sys


# 设置一些全局变量
class GlobalFlags():
    
    # 输出文件夹
    toDirectory: str = './output/'

    # 输入文件夹
    fromDirectory: str = './input/'
    
    # 是否展示 tokenize 阶段生成的文件
    ShowToken: bool = False

    # 是否展示 preprocess 阶段生成的文件
    ShowPreprocess: bool = False

    # 是否展示最终生成结果
    ShowOutput: bool = False


# 编译脚本的时候需要的一些全局变量
class ScriptGlobals():

    # 用于定义人物，这是 renpy 所使用的人物说话方式
    speaker_global_def: dict = {'plain': 'plain'}

    # 以下定义了有关声音的文件的路径
    # 因为这些声音都是按照路径查找
    # 所以如果自定义了路径就需要自己手动设置

    # 声音路径
    sound_path: str = 'audio/sound/'

    # 背景音乐路径
    bgm_path: str = 'audio/bgm/'


# 定义词法单元
class Token():
    def __init__(self, type: str) -> None:

        # 词法单元类型
        self.TokenType: str = type

        # 词法单元的无键属性存储
        self.Attribute_array: list[str] = []

        # 词法单元的有键属性存储
        self.Attribute_dict: dict = {}
        pass


# 词法分析
# 夜羊社的游戏使用的脚本是非常适合以行为单位分析的
# 每一个有操作的 tag 都是以一个左方括号开始
# 每一个对话如果有对话的人，会紧跟着一个语音，下一行就是对应说的话
# 只是测试的游戏没有遇上分支选择，所以没有处理分支选择，这可能会在未来考虑处理
def tokenize(strings: list[str]) -> list[Token]:
    TokenList: list[Token] = []
    for s in strings:

        # 删除空行
        if len(s) <= 0:
            pass

        # 处理注释
        elif s[0] == ';':
            tmp = Token('comment')
            tmp.Attribute_dict['content'] = s[1:]
            TokenList.append(tmp)

        # 处理标签
        # 标签很类似于xml，分析的时候可以按照 xml 分析方式分析
        elif s[0] == '[':
            tmp = Token('')
            attrs = s[1:-1].split(' ')
            tmp.TokenType = attrs[0]
            if len(attrs) > 1:
                for ats in attrs[1:]:
                    # 删除引号
                    ats = ats.replace('"', '')

                    # 直接正则获取属性
                    # 如果是 A=B 形式，则是有键属性，否则是无键属性
                    if re.match(r'(.*)=(.*)', ats) != None:
                        tmp.Attribute_dict[re.sub(r'(.*)=(.*)', r'\1', ats)] = re.sub(r'(.*)=(.*)', r'\2', ats)
                    else:
                        tmp.Attribute_array.append(ats)
            TokenList.append(tmp)

        # 处理章节标题
        elif s[0] == '*':
            tmp = Token('chapter')
            tmp.Attribute_dict['title'] = s
            TokenList.append(tmp)

        # 处理对话
        else:
            tmp = Token('talk')

            # 将半角的引号修改成全角的
            # 是的，这个游戏里引号有混用的情况，而 renpy 人物对话是需要用引号括出
            # 这里我处理的时候默认使用 " ，所以需要清除一下脏数据
            s = s.replace('"', '”')

            tmp.Attribute_dict['content'] = s
            TokenList.append(tmp)

    return TokenList


# 预处理
# 这只是生成代码前的对词法单元进行一定的预处理，以辅助生成 renpy 代码
# 这部分是将源代码使用的脚本变换成方便生成目标语言脚本的形式的过程
# 与常规的C语言里所说的预处理不太一样
def preprocess(tSequence: list[Token]) -> list[Token]:
    length: int = len(tSequence)

    # 交换说话的人的标签和声音标签
    # 源语言中说话方式是[speaker][voice]+一行话，而 renpy 中，我设计成 放声音+人物说话，所以进行了交换
    # 这一步便利转换
    for i in range(0, length-1):
        if tSequence[i].TokenType == 'speaker' and tSequence[i+1].TokenType == 'voice':
            tSequence[i], tSequence[i+1] = tSequence[i+1], tSequence[i]

    cleaned_Sequence: list[Token] = []
    for i in range(0, length):
        # 忽略注释，忽略开始
        if tSequence[i].TokenType == 'comment' or tSequence[i].TokenType == 'startadv':
            pass
        else:
            cleaned_Sequence.append(tSequence[i])


    num: int = 0
    for tk in cleaned_Sequence:
        # 制作出场人物对应表
        # 如果期望使用人名对应罗马音，需要下载额外包 `pykakasi`
        if tk.TokenType == 'speaker':
            if ScriptGlobals.speaker_global_def.get(tk.Attribute_dict['name'], '') == '':
                ScriptGlobals.speaker_global_def[tk.Attribute_dict['name']] = 'actor' + str(num)
                num = num + 1

        # 这里取消了特效，会换成引号
        # ruby 这个属性我并不了解，所以没有处理它，而是修改了
        if tk.TokenType == 'talk':
            c = tk.Attribute_dict['content']
            c = re.sub(r'(.*)\[ruby text=(.*)\](.*)', r'\1\2\3', c)
            c = re.sub(r'\[.*\]', r'', c)
            tk.Attribute_dict['content'] = c

        # renpy 中处理图片默认小写
        # 需要将图片的名称都修改成对应的小写形式
        if tk.TokenType == 'fgi' or tk.TokenType == 'bgi':
            tk.Attribute_dict['storage'] = tk.Attribute_dict['storage'].lower()

    return cleaned_Sequence


def generate_renpy_code(tSeq: list[Token], filename: str) -> list[str]:
    # 每行目标代码
    code_strline: str = ''

    # 对话者名称
    speaker_name: str = ''

    # 行号
    line_num = 0

    # 生成的代码
    renpy_code: list[str] = []

    # 图片前缀标签
    fig_prefix: list[str] = []

    # 最后一次出现的背景
    # 这个用于对应[fgc]标签，将所有的出场角色删除 
    last_bg: str = ''

    # 一些警告，用于精细化处理
    tail_warnings: list[str] = []

    # 该变量用于检查当前场上人物立绘个数
    # 因为测试用的 galgame 的立绘人物没办法移动位置，而且标签命名并没有做好
    # 这里为了方便，仅仅放置警告，方便手动调试
    fp_flag = False

    # 默认特效
    # 人的出场退场，背景的出场退场
    default_with: str = 'with dissolve'

    # 设置主 label
    # 也即每个文件的入口
    # 这里我会将每一个 galgame 脚本作为一个脚本单元，当需要的时候跳入
    # 这个做法是配合源语言的
    renpy_code.append('label ' + filename + ':')
    line_num = line_num + 1


    for tk in tSeq:
        code_strline = ''
        line_num = line_num + 1
        fp_flag = False

        # 生成人物说话的代码
        if tk.TokenType == 'speaker':
            speaker_name = tk.Attribute_dict['name']
            line_num = line_num - 1
        elif tk.TokenType == 'talk':
            if speaker_name == '':
                speaker_name = 'plain'
            code_strline = ScriptGlobals.speaker_global_def[speaker_name]
            speaker_name = ''
            code_strline = code_strline + ' "' + tk.Attribute_dict['content'] + '"'

        # 生成背景图代码
        # 所有背景都假设名称前方有前缀 'bg' 作为tag
        elif tk.TokenType == 'bgi':
            prefix = 'bg'
            last_bg = tk.Attribute_dict['storage']
            code_strline = 'show ' + prefix + ' ' + last_bg + ' ' + default_with
        
        # 生成人物立绘代码
        # 这里 prefix 为图片前缀，由个人自己设置
        # 我默认设置为一张图的名称中的非含数字前缀
        elif tk.TokenType == 'fgi':
            pic_name = tk.Attribute_dict['storage']
            prefix = re.sub(r'([^0-9]+).*', r'\1', pic_name)
            for fp in fig_prefix:
                if (fp == prefix):
                    fp_flag = True
                    break
            if not fp_flag:
                fig_prefix.append(prefix)
            if len(fig_prefix) > 1:
                tail_warnings.append('Warning: You need to edit the position of figures at line: ' + str(line_num))
            code_strline = 'show ' + prefix + ' ' + pic_name + ' ' + default_with
        # 利用 scene 的能力清空场景
        elif tk.TokenType == 'fgc':
            prefix = 'bg'
            fig_prefix = []
            code_strline = 'scene ' + prefix + ' ' + last_bg + ' ' + default_with

        # 生成声音代码
        # fadein 默认参数 1.0
        # fadeout 默认参数 1.0
        elif tk.TokenType == 'voice':
            code_strline = 'play sound "' + ScriptGlobals.sound_path + tk.Attribute_dict['file'] + '.ogg"'
        elif tk.TokenType == 'fadeinbgm':
            code_strline = 'play music "' + ScriptGlobals.bgm_path + tk.Attribute_dict['storage'] + '.ogg" fadein 1.0'
        elif tk.TokenType == 'fadeoutbgm':
            code_strline = 'stop music fadeout 1.0'
        elif tk.TokenType == 'playbgm':
            code_strline = 'play music "' + ScriptGlobals.bgm_path + tk.Attribute_dict['storage'] + '.ogg"'

        # 处理跳转
        elif tk.TokenType == 'jump':
            target = tk.Attribute_dict['storage']
            target = re.sub(r'(.*)\.ks$', r'\1', target)
            code_strline = 'jump ' + target
        # 这里放置一个跳转过去，还要一个跳转回来的返回点
        elif tk.TokenType == 'scef':
            target = tk.Attribute_dict['storage']
            target = re.sub(r'(.*)\.ks$', r'\1', target)
            code_strline = 'jump ' + target
            renpy_code.append('    ' + code_strline)
            code_strline = 'label ' + target + 'backpoint:'
        elif tk.TokenType == 'return':
            target = filename
            code_strline = 'jump ' + target + 'backpoint'
        # 这里放置未能解决的标签
        else:
            code_strline = '# ' + tk.TokenType

        if len(code_strline) > 0:
            renpy_code.append('    ' + code_strline)
    
    # 加上警告
    for twarn in tail_warnings:
        renpy_code.append('# ' + twarn)
    
    return renpy_code



def mkdir(path: str):
    if not os.path.exists(path):
        os.makedirs(path)


if __name__ == '__main__':
    for flag in sys.argv:
        if (flag == '-t'):
            GlobalFlags.ShowToken = True
        elif (flag == '-e'):
            GlobalFlags.ShowPreprocess = True
        elif (flag == '-o'):
            GlobalFlags.ShowOutput = True

    # 生成 output 文件夹
    mkdir(GlobalFlags.toDirectory)

    # 查找 input 文件夹
    if not os.path.exists(GlobalFlags.fromDirectory):
        print('Can not find directory: ' + GlobalFlags.fromDirectory)
        exit(0)

    # 获取 ks 文件的文件名
    files = os.listdir(GlobalFlags.fromDirectory)
    ks_files = []
    for f in files:
        if re.match(r'.*\.ks$', f):
            ks_files.append(re.sub(r'(.*)\.ks$', r'\1', f))
    print(ks_files)

    # 对每个文件进行操作
    for f in ks_files:
        # 打开文件
        raw_strs = open(GlobalFlags.fromDirectory + f + '.ks', 'rb').read()

        print("On file: " + f)

        # 转码
        raw_strs = raw_strs.decode('shiftjis')

        # 将一些不怎么喜欢的格式转换一下，然后获取每行信息。
        # 从每一行由 `\r\n` 结尾可以看出，该文件是 windows 下写的。
        string_array = raw_strs.replace('][', ']\r\n[')
        string_array = string_array.replace('[pl]', ' (>.<)')
        string_array = string_array.replace('\t', '')
        string_array = string_array.split('\r\n')

        # Token 化
        Tokens = tokenize(string_array)

        # 是否打印 Token 化结果
        if GlobalFlags.ShowToken:
            token_output_file = open(GlobalFlags.toDirectory + f + '.tokens', 'w')
            for tk in Tokens:
                print(tk.TokenType, tk.Attribute_dict, tk.Attribute_array, file=token_output_file)

        # 简单的预处理一下
        preprocessed = preprocess(Tokens)

        if GlobalFlags.ShowPreprocess:
            preprocess_output_file = open(GlobalFlags.toDirectory + f + '.pre', 'w')
            for tk in preprocessed:
                print(tk.TokenType, tk.Attribute_dict, tk.Attribute_array, file=preprocess_output_file)

        # 生成 renpy 代码
        out_code = generate_renpy_code(preprocessed, f)

        if GlobalFlags.ShowOutput:
            out_code_output_file = open(GlobalFlags.toDirectory + f + '.rpy', 'w')
            for l in out_code:
                print(l, file=out_code_output_file)

    if GlobalFlags.ShowOutput:
        start_output_file = open(GlobalFlags.toDirectory + 'start' + '.rpy', 'w')
        for k in ScriptGlobals.speaker_global_def:
            print('define ' + ScriptGlobals.speaker_global_def[k] + ' = ' + 'Character("%s")' % k, file=start_output_file)
        print('label start:', file=start_output_file)
        print('    jump first_scene # 自己选择', file=start_output_file)
        print('    return', file=start_output_file)
```