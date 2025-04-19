import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class CompleteUserJourneyTest extends Simulation {

  val httpProtocol = http
    .baseUrl("http://gatewayservice:8000")
    .header("Content-Type", "application/json")
    .acceptHeader("application/json")
  
  // Basic username generation
  val feeder = Iterator.from(1).map(i => Map("username" -> s"testuser${i}", "password" -> "password123"))
  
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
    .check(status.is(200))
    .check(jsonPath("$[0].question_id").saveAs("questionId"))
  )

  setUp(
    scenario("Registration and Login Test")
      .exec(registerScenario)
      .pause(2.seconds)
      .exec(loginScenario)
      .pause(2.seconds)
      .exec(browseTopics)
      .pause(2.seconds)
      .exec(viewTopicQuizzes)
      .inject(atOnceUsers(10))
  ).protocols(httpProtocol)
}