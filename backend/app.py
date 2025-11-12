from flask import Flask, request, jsonify
from flask_cors import CORS
from models import PREDICTOR
from preprocess import clean_text
from sqlalchemy import create_engine, Column, Integer, String, Float, Text, MetaData, Table

app = Flask(__name__)
CORS(app)

engine = create_engine('sqlite:///database.db')
metadata = MetaData()
predictions = Table('predictions', metadata,
                    Column('id', Integer, primary_key=True),
                    Column('text', Text),
                    Column('pred_label', String(10)),
                    Column('confidence', Float),
                    Column('user_feedback', String(10)))
metadata.create_all(engine)

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    text = data.get('text','')
    if not text:
        return jsonify({'error':'no text provided'}), 400
    cleaned = clean_text(text)
    res = PREDICTOR.predict([cleaned])[0]
    ins = predictions.insert().values(text=text, pred_label=res['label'], confidence=res['confidence'])
    conn = engine.connect()
    conn.execute(ins)
    conn.close()
    return jsonify(res)

@app.route('/feedback', methods=['POST'])
def feedback():
    data = request.json
    text = data.get('text')
    feedback_label = data.get('feedback')
    conn = engine.connect()
    upd = predictions.update().where(predictions.c.text==text).values(user_feedback=feedback_label)
    conn.execute(upd)
    conn.close()
    return jsonify({'ok':True})

if __name__ == '__main__':
    app.run(debug=True)
