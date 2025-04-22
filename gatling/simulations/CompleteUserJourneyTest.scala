import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._
import java.util.UUID

class CompleteUserJourneyTest extends Simulation {

  val httpProtocol = http
    .baseUrl("http://gatewayservice:8000")
    .header("Content-Type", "application/json")
    .acceptHeader("application/json")

  val feeder = Iterator.continually {
    val uuid = UUID.randomUUID().toString.take(8)
    Map(
      "username" -> s"testusernumber${uuid}",
      "password" -> "password123"
    )
  }
  
  // Full sequential user journey with the original logic intact
  val userScenario = scenario("Sequential User Journey")
    // Step 1: Register a new user
    .feed(feeder)
    .exec(http("1. Register New User")
      .post("/adduser")
      .body(StringBody("""{"username":"${username}","password":"${password}","role":"USER"}"""))
      .check(status.in(200, 201))
      .check(responseTimeInMillis.saveAs("registerResponseTime"))
    )
    .exec(session => {
      val responseTime = session("registerResponseTime").as[Int] // Fixed cast to Int
      println(s"Step 1 completed: Register user ${session("username").as[String]} - Response time: ${responseTime}ms")
      session
    })
    
    // Step 2: Login - only proceeds after registration completes
    .exec(http("2. Login Request")
      .post("/login")
      .body(StringBody("""{"user":{"username":"${username}","password":"${password}"}}"""))
      .check(jsonPath("$.token").saveAs("authToken"))
      .check(responseTimeInMillis.saveAs("loginResponseTime"))
    )
    .exec(session => {
      val responseTime = session("loginResponseTime").as[Int] // Fixed cast to Int
      println(s"Step 2 completed: Login - Response time: ${responseTime}ms")
      println(s"Auth token received: ${session("authToken").as[String].take(20)}...")
      session
    })
    
    // Step 3: Browse available quiz topics - only proceeds after login completes
    .exec(http("3. Get Quiz Topics")
      .get("/quiz/allTopics")
      .header("Authorization", "Bearer ${authToken}")
      .check(status.is(200))
      .check(bodyString.saveAs("topicsResponse"))
      .check(regex("""["']([^"']+)["']""").findRandom.saveAs("firstTopic"))
      .check(responseTimeInMillis.saveAs("topicsResponseTime"))
    )
    .exec(session => {
      val responseTime = session("topicsResponseTime").as[Int] // Fixed cast to Int
      println(s"Step 3 completed: Get Topics - Response time: ${responseTime}ms")
      println(s"Selected topic: ${session("firstTopic").as[String]}")
      println(s"Topics response: ${session("topicsResponse").as[String]}")
      session
    })
    
    // Step 4: View quizzes for a specific topic - only proceeds after topics are retrieved
    .exec(http("4. Get Topic Quizzes")
      .get("/quiz/${firstTopic}")
      .header("Authorization", "Bearer ${authToken}")
      .check(status.is(200))
      .check(bodyString.saveAs("quizzesResponse"))
      .check(jsonPath("$[0].wikidataCode").optional.saveAs("extractedCode"))
      .check(responseTimeInMillis.saveAs("quizzesResponseTime"))
    )
    .exec(session => {
      val responseTime = session("quizzesResponseTime").as[Int] // Fixed cast to Int
      println(s"Step 4 completed: Get Topic Quizzes - Response time: ${responseTime}ms")
      println(s"Quizzes response: ${session("quizzesResponse").as[String]}")
      
      // Use extracted code if available, otherwise use default
      val code = session.attributes.get("extractedCode") match {
        case Some(value) if value != null => value.toString
        case _ => "Q2329" // Default to biology if extraction fails
      }
      println(s"Using subject code: $code")
      session.set("subjectCode", code)
    })
    
    // Step 5: Get Game Questions - only proceeds after quizzes are retrieved
    .exec(http("5. Get Game Questions")
      .get("/game/${subjectCode}/5/4")
      .header("Authorization", "Bearer ${authToken}")
      .check(status.saveAs("gameStatus"))
      .check(bodyString.saveAs("gameQuestionsResponse"))
      .check(jsonPath("$[0].question_id").optional.saveAs("questionIdOpt"))
      .check(responseTimeInMillis.saveAs("gameQuestionsResponseTime"))
    )
    .exec(session => {
      val responseTime = session("gameQuestionsResponseTime").as[Int] // Fixed cast to Int
      val gameResponse = session("gameQuestionsResponse").as[String]
      val gameStatus = session("gameStatus").as[String]
      
      println(s"Step 5 completed: Get Game Questions - Response time: ${responseTime}ms")
      println(s"Game questions status: $gameStatus")
      println(s"Game questions sample: ${gameResponse.take(200)}...")
      
      // Create a dummy questionId if the extraction failed
      val questionId = session.attributes.get("questionIdOpt") match {
        case Some(id) if id != null => id.toString
        case _ => "5f8d0d55d4aaed429451106a" // Fallback MongoDB ObjectId format
      }
      
      println(s"Using question_id: $questionId")
      session.set("questionId", questionId)
    })
    
    // Step 6: Validate Answer - only proceeds after game questions are retrieved
    .exec(http("6. Validate Answer")
      .post("/question/validate")
      .header("Authorization", "Bearer ${authToken}")
      .body(StringBody("""{"question_id":"${questionId}","selected_answer":"test answer"}"""))
      .check(status.in(200, 404))
      .check(responseTimeInMillis.saveAs("validateResponseTime"))
    )
    .exec(session => {
      val responseTime = session("validateResponseTime").as[Int] // Fixed cast to Int
      println(s"Step 6 completed: Validate Answer - Response time: ${responseTime}ms")
      session
    })
    
    // Step 7: Submit Game Results - only proceeds after answer validation completes
    .exec(http("7. Submit Game Results")
      .post("/game")
      .header("Authorization", "Bearer ${authToken}")
      .body(StringBody("""{"subject":"${subjectCode}","points_gain":100,"number_of_questions":5,"number_correct_answers":3,"total_time":120}"""))
      .check(status.in(201, 200))
      .check(responseTimeInMillis.saveAs("submitGameResponseTime"))
    )
    .exec(session => {
      val responseTime = session("submitGameResponseTime").as[Int] // Fixed cast to Int
      println(s"Step 7 completed: Submit Game Results - Response time: ${responseTime}ms")
      session
    })
    
    // Step 8: Get Global Stats - only proceeds after game results are submitted
    .exec(http("8. Get Global Stats")
      .get("/statistics/global")
      .header("Authorization", "Bearer ${authToken}")
      .check(status.is(200))
      .check(responseTimeInMillis.saveAs("statsResponseTime"))
    )
    .exec(session => {
      val responseTime = session("statsResponseTime").as[Int] // Fixed cast to Int
      println(s"Step 8 completed: Get Global Stats - Response time: ${responseTime}ms")
      session
    })
    
    // Step 9: Get Leaderboard - only proceeds after stats are retrieved
    .exec(http("9. Get Leaderboard")
      .get("/leaderboard")
      .header("Authorization", "Bearer ${authToken}")
      .check(status.is(200))
      .check(responseTimeInMillis.saveAs("leaderboardResponseTime"))
    )
    .exec(session => {
      val responseTime = session("leaderboardResponseTime").as[Int] // Fixed cast to Int
      println(s"Step 9 completed: Get Leaderboard - Response time: ${responseTime}ms")
      println(s"Full journey completed for user: ${session("username").as[String]}")
      session
    })

  setUp(
    userScenario.inject(
      // Small user base
      atOnceUsers(100),
      
      // Gradual ramp-up to 5000 users
      nothingFor(10.seconds),
      rampUsers(400).during(20.seconds),
      nothingFor(10.seconds),
      rampUsers(500).during(20.seconds),
      nothingFor(10.seconds),
      rampUsers(1000).during(20.seconds),
      nothingFor(10.seconds),
      rampUsers(1000).during(20.seconds),
      nothingFor(10.seconds),
      rampUsers(2000).during(20.seconds)
    )
  ).protocols(httpProtocol)
    .maxDuration(20.minutes)
    .assertions(
      global.responseTime.max.lt(10000), // 10 seconds max response time
      global.successfulRequests.percent.gt(95) // 95% of requests should succeed
    )
}