import joblib
import numpy as np

MODEL_DIR = 'model'

class Predictor:
    def __init__(self):
        self.vect = joblib.load(f'{MODEL_DIR}/tfidf_vectorizer.pkl')
        self.clf = joblib.load(f'{MODEL_DIR}/clf_model.pkl')
        self.feature_names = np.array(self.vect.get_feature_names_out())

    def predict(self, texts):
        X = self.vect.transform(texts)
        probs = self.clf.predict_proba(X)[:,1]
        preds = (probs >= 0.5).astype(int)
        labels = ['REAL' if p==1 else 'FAKE' for p in preds]
        explanations = [self._explain_single(x, probs[i]) for i,x in enumerate(X)]
        return [{'label': labels[i], 'confidence': float(probs[i]), 'explanation': explanations[i]} for i in range(len(texts))]

    def _explain_single(self, x_vector, prob):
        coefs = self.clf.coef_[0]
        contrib = x_vector.toarray().ravel() * coefs
        top_pos_idx = np.argsort(contrib)[-5:][::-1]
        top_neg_idx = np.argsort(contrib)[:5]
        top_pos = [(self.feature_names[i], float(contrib[i])) for i in top_pos_idx if contrib[i] > 0]
        top_neg = [(self.feature_names[i], float(contrib[i])) for i in top_neg_idx if contrib[i] < 0]
        return {'positive': top_pos, 'negative': top_neg}

PREDICTOR = Predictor()
