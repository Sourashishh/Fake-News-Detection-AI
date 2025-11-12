import pandas as pd

# Load both CSVs
fake = pd.read_csv('data/Fake.csv')
true = pd.read_csv('data/True.csv')

# Add labels
fake['label'] = 'FAKE'
true['label'] = 'REAL'

# Merge
df = pd.concat([fake, true], ignore_index=True)

# Normalize text column
if 'text' in df.columns:
    df = df[['text', 'label']]
elif 'article' in df.columns:
    df.rename(columns={'article': 'text'}, inplace=True)
    df = df[['text', 'label']]
elif 'content' in df.columns:
    df.rename(columns={'content': 'text'}, inplace=True)
    df = df[['text', 'label']]

# Save final dataset (overwrite old dataset)
df.to_csv('data/fake_or_real_news.csv', index=False)

print(" Final dataset saved as data/fake_or_real_news.csv")
print("Total rows:", len(df))
print(df['label'].value_counts())
print(df.head(3))
