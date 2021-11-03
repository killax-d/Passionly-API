import random

N = int(input("Number of users needed : "))
last_address_id = int(input("Last address id : "))
last_user_id = int(input("Last user id : "))

file = open('users.sql', 'w+')

questions = {
	1: {'unique': True, 'criteria': 'random', 'answers': [1, 2, 3]},
	2: {'unique': True, 'criteria': 'random', 'answers': [4, 5, 6]},
	3: {'unique': True, 'criteria': 'random', 'answers': [7, 8]},
	4: {'unique': True, 'criteria': 'random', 'answers': [9, 10, 11]},
	5: {'unique': True, 'criteria': 'random', 'answers': [12, 13, 14, 15]},
	6: {'unique': False, 'criteria': 'random', 'answers': [16, 17, 18, 19, 20]},
	7: {'unique': True, 'criteria': 'range', 'ranges': [18, 100, 1]},
	8: {'unique': True, 'criteria': 'slide', 'ranges': [0, 1000, 5]},
	9: {'unique': True, 'criteria': 'random', 'answers': [23, 24, 25]}
}

ADDRESS_FORMAT = "({0}, '{1}', '{2}', {3})"
USER_FORMAT = "('{0}', '{1}', '{2}', '{3}', '{4}', '{5}', '{6}', {7}, {8}, {9}, '{10}')"
SURVEY_FORMAT = "({0}, {1}, {2}, {3}, {4})"
SUBSCRIPTION_FORMAT = "({0}, 2, 999)"

password = "$2a$10$dnDZhS4hqAR1rWnAwiMi/uqQfulrQbP9jO.d4h.v3fyQbyaIZMpGW" # password
cities = ['Marseille', 'Douai', 'Lens', 'Paris', 'Bordeaux', 'Auby', 'Nantes', 'Montpellier', 'Lille', 'Reims', 'Angers', 'Dunkerque']

firstname = [['John', 'Dylan', 'Jason', 'Maxime', 'Kévin', 'Aurélien', 'Quentin', 'Aymeric'], ['Amélie', 'Aurélie', 'Carla', 'Jessie', 'Noémie', 'Ambre', 'Rose', 'Chloé']]

langs = ['fr', 'en']

def generateAnswers(user, question):
	q = questions[question]
	if (q['criteria'] == 'random'):
		if (q['unique']):
			return SURVEY_FORMAT.format(user, question, random.choice(q['answers']), 'NULL', 'NULL')
		else:
			answers = []
			for i in random.sample(q['answers'], random.randint(1, len(q['answers'])-1)):
				answers.append(SURVEY_FORMAT.format(user, question, i, 'NULL', 'NULL'))
			return ', '.join(answers)
	elif (q['criteria'] == 'range'):
		mini, maxi = random.randint(q['ranges'][0], q['ranges'][1]), random.randint(q['ranges'][0], q['ranges'][1])
		#mini, maxi = q['ranges'][0], q['ranges'][1]
		if (mini > maxi): 
			mini, maxi = maxi, mini
		return SURVEY_FORMAT.format(user, question, 'NULL', mini, maxi)
	elif (q['criteria'] == 'slide'):
		maxi = random.randint(q['ranges'][0], q['ranges'][1])
		maxi -= maxi % q['ranges'][2]
		return SURVEY_FORMAT.format(user, question, 'NULL', q['ranges'][0], maxi)

def generateAddress():
	address_id = last_address_id
	address = [address_id, 'Rue Lambda', random.choice(cities), 1]
	return (address_id, ADDRESS_FORMAT.format(address_id, 'Rue Lambda', random.choice(cities), 1))

def generatePhoneNumber():
	phone = random.randint(10000000, 99999999)
	return '06{0}'.format(phone)

def generateBirthdate():
	year = random.randint(1920, 2004)
	month = random.randint(1, 12)
	day = random.randint(1, 28)
	return '{0}-{1}-{2}'.format(year, month, day)

# return postgres string
def generateLastActivity():
	return "(NOW() - '{0} days'::interval)".format(random.randint(1, 35))

def generateUser(id):
	gender = random.choice([0, 1])
	address = generateAddress() # [id, address array]
	user = ['generated-{0}'.format(id), password, random.choice(firstname[gender]), '{0}-lastname'.format('Male' if gender == 0 else 'Female'), 'generated-{0}@mail.fr'.format(id), generatePhoneNumber(), generateBirthdate(), gender, address[0], generateLastActivity(), random.choice(langs)]
	survey = []
	for i in questions.keys():
		survey.append(generateAnswers(id, i))

	return user, address[1], survey

generated_users = []
for i in range(N):
	last_address_id += 1
	last_user_id += 1
	user = generateUser(last_user_id)
	generated_users.append({'user': user[0], 'address': user[1], 'survey': user[2], 'subscription': SUBSCRIPTION_FORMAT.format(last_user_id)})


users = []
addresses = []
surveys = []
subscriptions = []
for user in generated_users:
	users.append(str(user['user']).replace("[", "(").replace("]", ")").replace('"', ''))
	addresses.append(str(user['address']).replace("[", "(").replace("]", ")"))
	surveys.append(", ".join(user['survey']).replace("[", "(").replace("]", ")").replace("'", ""))
	subscriptions.append(str(user['subscription']).replace("[", "(").replace("]", ")"))

users = ",\n".join(users) + ";"
addresses = ",\n".join(addresses) + ";"
surveys = ",\n".join(surveys) + ";"
subscriptions = ",\n".join(subscriptions) + ";"

file.write(
"""-- ADDRESSES : --
INSERT INTO addresses (street_nr, street, city, fk_country) VALUES 
{0}


-- USERS : --
INSERT INTO users (username, password, firstname, lastname, email, phone, birthdate, gender, fk_address, last_login, language) VALUES
{1}


-- SURVEYS : --
INSERT INTO surveys (fk_userid, fk_questionid, fk_answerid, min, max) VALUES
{2}


-- SUBSCRIPTION : --
INSERT INTO subscription (fk_userid, gender_desired, match_left) VALUES
{3}
"""
	.format(addresses, users, surveys, subscriptions));

file.close()