import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib
from preprocess import clean_text
import os

DATA_PATH = 'data/fake_or_real_news.csv'
MODEL_DIR = 'model'

def load_and_prepare(path):
    df = pd.read_csv(path) #Load dataset into pandas DataFrame 
    if 'text' not in df.columns:  # search if text is there in dataset
        if 'article' in df.columns: #if article is in dataset       
            df['text'] = df['article']  #then change the name to text 
        elif 'content' in df.columns:
            df['text'] = df['content'] #same with coloumn 
    if 'label' not in df.columns: #search if label is in dataset or not 
        raise ValueError('Dataset must have a `label` column with values FAKE/REAL') #if not raises a error
    df['text_clean'] = df['text'].astype(str).apply(clean_text) #Cleans the text 
    return df[['text_clean', 'label']]

def train():
    df = load_and_prepare(DATA_PATH)
    X = df['text_clean'] #series of clean text  
    y = df['label'].map({'FAKE':0, 'REAL':1}) #Changes the label of each to 0/1 cause easy to process 

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.15, random_state=42) # Train the data (X_train = Training , X_test=Testing same for y , Gives output in matrix of 
    #and y , we distribute the data for test size , and random_state shuffles the data for reproducibility.)

    vect = TfidfVectorizer(max_features=50000, ngram_range=(1,2)) #Use Td-IDF (Term Frequency - Inverse document Frequency) TF - how often a word appers IDF - How much rare that word is 
    # take 50000 most rare words , use 1 gram for single words and 2 gram for two words.
    Xtr = vect.fit_transform(X_train) # Two actions : Fit ( Learn the vocabulary from IDF Set , Transform turns each text into sparse of matrix(Sparse matrix only stores the non zero values with their position))
    Xte = vect.transform(X_test) #We only transform not fit it 

    clf = LogisticRegression(max_iter=1000) #training Logistic Regression 
    clf.fit(Xtr, y_train)

    preds = clf.predict(Xte) # clf is the logistic Regression , XTE is the TF-IDF test articles
    probs = clf.predict_proba(Xte)[:,1] #probs is an array of (0,1) carries fake or real 

    print('Accuracy:', accuracy_score(y_test, preds)) #compare predicted labels with actual labels (y_tests)
    print(classification_report(y_test, preds))#Prints a detailed performance report for each class (FAKE=0, REAL=1).
                        #Metrics:
                                    #Precision → of the articles predicted as REAL, how many were actually REAL?
                                    #Recall → of all actual REAL articles, how many did we correctly predict as REAL?
                                    #F1-score → balance between precision and recall.
                                    #Support → number of true samples for each class.

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(vect, f'{MODEL_DIR}/tfidf_vectorizer.pkl')
    joblib.dump(clf, f'{MODEL_DIR}/clf_model.pkl')
    print('Saved model to', MODEL_DIR)

if __name__ == '__main__':
    train()
