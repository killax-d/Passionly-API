const { client } = require('../db/client');
const bcrypt = require('bcrypt-nodejs');
const parser = require('../services/parser');

// GET ALL
const getAll = async (request, response) => {
	var values = {};
	var user = request.user;

	var survey_results = await client.query('SELECT * FROM surveys WHERE fk_userid = $1', [user.id]);
	var results = await client.query('SELECT question_categories.id AS cat_id, quest_category_name_key, icon, min, max, step, questions.id as quest_id, type, quest_key, fk_category, answers.id as ans_id, fk_question, answer_key, src FROM question_categories INNER JOIN questions ON question_categories.id = questions.fk_category INNER JOIN answers ON questions.id = answers.fk_question;');

	var index = 0;
	var prev_quest_id = -1;
	results.rows.forEach((row) => {
		var category = row.quest_category_name_key;

		if (!values[category]) values[category] = {id: row.cat_id, icon: row.icon ? row.icon : 'help_outline', key: row.quest_category_name_key, questions: []};
		if (prev_quest_id !== row.quest_id) index = values[category].questions.push({id: row.quest_id, type: row.type, answers: [], key: row.quest_key}) -1;

		var answer = {id: row.ans_id, key: row.answer_key};

		if (row.type.startsWith('image')) answer.src = row.src ? row.src : "https://getuikit.com/v2/docs/images/placeholder_600x400.svg";

		if (row.min || row.max) {
			values[category].questions[index].answers = { min: row.min, max: row.max };
			values[category].questions[index].step = row.step;
			var survey = survey_results.rows.filter((survey) => survey.fk_questionid === row.quest_id);
			if (survey.length > 0) {
				values[category].questions[index].answered = true;
				values[category].questions[index].answer = { min: survey[0].min, max: survey[0].max };
			}
		} else {
			var survey = survey_results.rows.filter((survey) => survey.fk_answerid === row.ans_id);
			if (survey.length > 0) {
				values[category].questions[index].answered = true;
				answer.selected = true;
			}
			values[category].questions[index].answers.push(answer);
		}

		prev_quest_id = row.quest_id;
	})

	return response.status(200).json({success: true, values: values});
}

// GET SURVEY STATE
const getSurveyState = async (request, response) => {
	let survey_complete = request.user.survey_complete;
	return response.status(200).json({success: true, survey_complete});
}

// GET ANSWERS BY QUESTION ID
const getAnswersByQuestionId = async (id) => {
	var result = await client.query('SELECT * FROM answers WHERE fk_question = $1;', [id]);
	return result.rows;
}

// GET BY CATEGORY
const getQuestionById = async (id) => {
	var result = await client.query('SELECT * FROM questions WHERE id = $1 LIMIT 1;', [id]);
	return result.rows[0];
}

// UPDATE ANSWER
const updateAnswer = async (request, response) => {
	var user = request.user;
	var QuestId = Number(request.body.quest_id);
	var Answers = request.body.answers;
	if (Answers.length === 0) throw new HttpError('No answer provided', 409);

	var question = await getQuestionById(QuestId);

	await client.query('DELETE FROM surveys WHERE fk_questionid = $1 AND fk_userid = $2', [QuestId, user.id]);
	// Retrieve question answers
	var answers = await getAnswersByQuestionId(QuestId);
	var validAnswers = [];

	switch(question.type) {
		case 'restrictive':
		case 'choice':
		case 'image':
			if (answers.some((a) => a.id === Answers[0])) validAnswers.push(Answers[0]);
			break;
		case 'choices':
		case 'images':
			Answers.forEach((a) => {
				if (answers.some((ans) => ans.id === a)) validAnswers.push(a);
			})
			break;
		case 'range':
			if (answers[0].min <= Answers[0] && Answers[1] <= answers[0].max && ((Answers[0] % answers[0].step) + (Answers[1] % answers[0].step)) === 0) validAnswers.push({ min: Answers[0], max: Answers[1] });
			break;
		case 'slide':
			if (Answers[0] <= answers[0].max && Answers[0] % answers[0].step === 0) validAnswers.push({ min: answers[0].min, max: Answers[0] });
			break;
		default:
			console.log('[ERROR] Unknown question type : ' + question.type);
			break;
	}
	if (validAnswers.length === 0) throw new HttpError('No valid answer', 409);

	var queryValues = validAnswers.map((ans) => ans.min || ans.max ? [user.id, QuestId, null, ans.min, ans.max] : [user.id, QuestId, ans, null, null] );
	await queryValues.asyncForEach(async (value) => await client.query('INSERT INTO surveys (fk_userid, fk_questionid, fk_answerid, min, max) VALUES ($1, $2, $3, $4, $5);', value))
	
	let survey_complete = await client.query('SELECT survey_complete FROM users WHERE id = $1', [user.id]);
	survey_complete = survey_complete.rows[0].survey_complete;

	return response.status(200).json({success: true, survey_complete});
}

// GET ANSWER BY USERID AND CRITERIA
const getAnswerCriteriaFor = async (id, criteria) => {
	let results = await client.query('SELECT * FROM surveys WHERE fk_userid = $1 AND fk_questionid = (SELECT id FROM questions WHERE criteria = $2 LIMIT 1) LIMIT 1', [id, criteria]);
	if (results.rows && results.rows[0]) return results.rows[0];
}

module.exports = {
	getAll,
	updateAnswer,
	getAnswerCriteriaFor,
	getSurveyState
}