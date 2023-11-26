import re
import json

constitution = open(f"./constitution.txt", "r")
constitutionTxt = constitution.read()
pattern = re.compile(r'Article \d+')
articles = pattern.findall(constitutionTxt)
pattern = re.compile(r'Amendment \d+')
amendments = pattern.findall(constitutionTxt)
attList = articles + amendments


print(attList)
attDict = {}
for i in range(len(attList)):
    attStrt = constitutionTxt.index(attList[i])
    if i + 1 == len(attList):
        attEnd = len(constitutionTxt)
    else:
        attEnd = constitutionTxt.index(attList[i + 1])
    attDict[attList[i]] = {"id" : i, "title" : attList[i], "description" : constitutionTxt[attStrt + len(attList[i]) : attEnd]}

# json.dump(attDict, open(f"./attacks.json", "w"), indent=2)
print(attDict)
