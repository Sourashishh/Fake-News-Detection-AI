import re      # Importing Regular Expressions
import nltk    # Importing Natural Language Toolkit
from nltk.corpus import stopwords   # Fom NLTK importing stopwords to remove words like ("is, the ,a , are")
from nltk.stem import SnowballStemmer # To bring a word to its root form (running : run , Governance : Govern )

nltk.download('stopwords') 

STOP = set(stopwords.words('english')) #return as a set so that easy to process 
stemmer = SnowballStemmer('english')    # To normalize words so the model doesn’t treat “run”, “runs”, “running” as separate.
 
def clean_text(text: str) -> str:
    if not isinstance(text, str):
        return ""
    text = text.lower()    # change into lowercase so easy to process 
    text = re.sub(r"http\S+", "", text)  #regex function to remove the links 
    text = re.sub(r"[^a-z0-9\s]", " ", text) #regex function to remove everything other than (a-z,0-9,space,"")
    tokens = [t for t in text.split() if t not in STOP and len(t) > 1] #Split clean text into individual words 
    tokens = [stemmer.stem(t) for t in tokens]  #Helps generalize: “run”, “runs”, “running” all become “run”.
    return " ".join(tokens)  #Joins the list of cleaned tokens back into a single string.s
