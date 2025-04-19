import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._
import java.util.UUID

class CompleteUserJourneyTest extends Simulation {

  val httpProtocol = http
    .baseUrl("http://gatewayservice:8000")
    .header("Content-Type", "application/json")
    .acceptHeader("application/json")
  
  // Update feeder with better user generation
  val feeder = Iterator.continually {
    val timestamp = System.currentTimeMillis()
    val uuid = UUID.randomUUID().toString.take(8)
    Map(
      "username" -> s"test_${timestamp}_${uuid}",
      "password" -> "password123"
    )
  }
  
  // Register scenario
  val registerScenario = feed(feeder)
    .exec(http("Register New User")
      .post("/adduser")
      .body(StringBody("""{"username":"${username}","password":"${password}","role":"USER"}"""))
      .check(status.in(200, 201))
    )
  
  // Login scenario
  val loginScenario = exec(http("Login Request")
    .post("/login")
    .body(StringBody("""{"user":{"username":"${username}","password":"${password}"}}"""))
    .check(jsonPath("$.token").saveAs("authToken"))
  )

  // Browse available quiz topics
  val browseTopics = exec(http("Get Quiz Topics")
    .get("/quiz/allTopics")
    .header("Authorization", "Bearer ${authToken}")
    .check(status.is(200))
    .check(bodyString.saveAs("topicsResponse"))
    .check(regex("""["']([^"']+)["']""").findRandom.saveAs("firstTopic"))
  )
  .exec(session => {
    println(s"Topics response: ${session("topicsResponse").as[String]}")
    println(s"Selected topic: ${session("firstTopic").as[String]}")
    session
  })

  // View quizzes for a specific topic
  val viewTopicQuizzes = exec(http("Get Topic Quizzes")
    .get("/quiz/${firstTopic}")
    .header("Authorization", "Bearer ${authToken}")
    .check(status.is(200))
    .check(bodyString.saveAs("quizzesResponse"))
    .check(jsonPath("$[0].wikidataCode").optional.saveAs("extractedCode"))
  )
  .exec(session => {
    println(s"Quizzes response: ${session("quizzesResponse").as[String]}")
    
    val code = session.attributes.get("extractedCode") match {
      case Some(value) => value.toString
      case None => "Q2329" // Default to biology
    }
    session.set("subjectCode", code)
  })

  // Basic game playing scenario
  val playGame = exec(http("Get Game Questions")
    .get("/game/${subjectCode}/5/4")
    .header("Authorization", "Bearer ${authToken}")
    .check(status.saveAs("gameStatus"))
    .check(bodyString.saveAs("gameQuestionsResponse"))
    .check(jsonPath("$[0].question_id").optional.saveAs("questionIdOpt"))
  )
  .exec(session => {
    val gameResponse = session("gameQuestionsResponse").as[String]
    val gameStatus = session("gameStatus").as[String]
    
    println(s"Game questions status: $gameStatus")
    println(s"Game questions sample: ${gameResponse.take(200)}...")
    
    val questionId = session.attributes.get("questionIdOpt") match {
      case Some(id) if id != null => id.toString
      case _ => "5f8d0d55d4aaed429451106a" // Fallback ID
    }
    
    println(s"Using question_id: $questionId")
    session.set("questionId", questionId)
  })
  .doIfOrElse(session => session("gameStatus").as[String] == "200") {
    exec(http("Validate Answer")
      .post("/question/validate")
      .header("Authorization", "Bearer ${authToken}")
      .body(StringBody("""{"question_id":"${questionId}","selected_answer":"test answer"}"""))
      .check(status.in(200, 404))
    )
    .exec(http("Submit Game Results")
      .post("/game")
      .header("Authorization", "Bearer ${authToken}")
      .body(StringBody("""{"subject":"${subjectCode}","points_gain":100,"number_of_questions":5,"number_correct_answers":3,"total_time":120}"""))
      .check(status.in(201, 200))
    )
  } {
    exec(session => {
      println("Skipping validate due to game status.")
      session
    })
    .exec(session => {
      println("Skipping game results due to game status.")
      session
    })
  }
  .pause(1)

  // View statistics
  val viewStats = exec(http("Get Global Stats")
    .get("/statistics/global")
    .header("Authorization", "Bearer ${authToken}")
    .check(status.is(200))
  )
  .pause(1)
  .exec(http("Get Leaderboard")
    .get("/leaderboard")
    .header("Authorization", "Bearer ${authToken}")
    .check(status.is(200))
  )

  // Create full user journey
  val userScenario = scenario("User Journey")
    .exec(registerScenario)
    .pause(5.seconds)
    .exec(loginScenario)
    .pause(3.seconds)
    .exec(browseTopics)
    .pause(4.seconds)
    .exec(viewTopicQuizzes) 
    .pause(3.seconds)
    .exec(playGame)
    .pause(5.seconds)
    .exec(viewStats)
    .pause(10.seconds)

  setUp(
    scenario("Registration and Login Test")
      .exec(registerScenario)
      .pause(2.seconds)
      .exec(loginScenario)
      .pause(2.seconds)
      .exec(browseTopics)
      .pause(2.seconds)
      .exec(viewTopicQuizzes)
      .inject(atOnceUsers(10)),
    userScenario.inject(atOnceUsers(5))
  ).protocols(httpProtocol)
}