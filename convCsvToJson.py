import pandas as pd

OveruledDecisions = pd.read_csv("/Users/m296082/Downloads/Table of Supreme Court Decisions Overruled by Subsequent Decisions  Resources  Constitution Annotated  Congress.gov  Library of Congress.csv")
OveruledDecisions.to_json("OveruledDecisions.json", orient="table")

Overuledlaws = pd.read_csv("/Users/m296082/Downloads/Table of Laws Held Unconstitutional in Whole or in Part by the Supreme Court  Resources  Constitution Annotated  Congress.gov  Library of Congress.csv")
Overuledlaws.to_json("OveruledLaws.json", orient="table")