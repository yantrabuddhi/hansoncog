# -*- coding: utf-8 -*-
import re
import string

# 
text = 'can you turn head?？，。'
text = '你可以turn head吗?？，。'
print type(text)
text = text.decode('utf-8')
print type(text)
print text
exclude = '[%s]' % (re.escape(string.punctuation+u'你可以吗，。？'))
print exclude
regex = re.compile(exclude, re.U)
text = regex.sub('', text)
text = re.sub(r"\bcan you\b" , "", text)
text = '    j   f f f fff'
text = re.sub(r"\s+" , " ", text)
text = text.strip()
print  text
