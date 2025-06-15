from flask import Flask, render_template

app = Flask(__name__, static_folder='../frontend/static', template_folder='../frontend/templates')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/ratio_calc')
def ratio_calc():
    return render_template('Ratio_calc.html')

if __name__ == '__main__':
    app.run(debug=True)